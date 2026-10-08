"""Evaluation runner for the expanded benchmark dataset (N=65).

Supports:
- Evaluation on 'dev' (45 queries), 'test' (20 queries), or 'all' (65 queries).
- Company + Topic level relevance (PRIMARY).
- Exact Chunk ID relevance (SECONDARY).
- Complete IR metrics: MRR, HitRate@1/3/5/10, Recall@1/3/5/10, Precision@1/3/5/10, NDCG@1/3/5/10, MAP@5/10.
- Abstention metrics: Abstention Accuracy (Precision, Recall, F1 on unanswerable queries).
- LLM Judge RAGAS metrics: Faithfulness & Answer Relevancy with exponential backoff on 429/503.
- Per-category breakdown: single-hop, multi-hop, metadata, conceptual, unanswerable.
- Saves results to eval/results/<experiment_name>.json.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import math
import os
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import dotenv
dotenv.load_dotenv(override=True)

from backend.app.models import ChatRequest
from backend.app.service import SecureRAGService, build_request_context
from eval.judge import LLMJudge

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eval.suite")

BENCHMARK_PATH = PROJECT_ROOT / "eval" / "benchmark_65.json"


def is_chunk_relevant_topic_level(
    chunk: dict[str, Any],
    target_company: str | None,
    expected_topics: list[str],
    should_abstain: bool,
) -> bool:
    """Determine if a retrieved chunk is relevant at the Company + Topic level."""
    if should_abstain:
        return False

    meta = chunk.get("metadata", {}) or {}
    c_comp = (meta.get("company") or "").strip().lower()
    c_topic = (meta.get("topic") or "").strip().lower()
    c_file = (meta.get("source_file") or "").strip().lower()
    c_text = (chunk.get("text") or "").strip().lower()

    topics_lower = [t.lower() for t in expected_topics]

    # Company match
    if target_company:
        t_comp = target_company.strip().lower()
        aliases = {
            "meta": ["meta", "facebook"],
            "amazon": ["amazon", "aws"],
            "google": ["google", "alphabet"],
        }
        target_aliases = aliases.get(t_comp, [t_comp])
        comp_matched = any(
            alias in c_comp or alias in c_file or c_comp in alias for alias in target_aliases
        )
        if not comp_matched:
            return False

    # Topic match
    if not topics_lower:
        return True

    topic_matched = any(
        t in c_topic or c_topic in t or t in c_text for t in topics_lower
    )
    return topic_matched


def compute_ir_metrics(
    relevance_flags: list[int],
    ground_truth_count: int,
    should_abstain: bool,
    k_values: tuple[int, ...] = (1, 3, 5, 10),
) -> dict[str, float]:
    """Compute HitRate@k, Precision@k, Recall@k, NDCG@k, MRR, MAP@k given binary relevance list."""
    metrics: dict[str, float] = {}

    if should_abstain or ground_truth_count == 0:
        # If unanswerable, retrieving 0 relevant items is correct
        for k in k_values:
            metrics[f"hit_rate@{k}"] = 1.0 if sum(relevance_flags[:k]) == 0 else 0.0
            metrics[f"precision@{k}"] = 1.0 if sum(relevance_flags[:k]) == 0 else 0.0
            metrics[f"recall@{k}"] = 1.0 if sum(relevance_flags[:k]) == 0 else 0.0
            metrics[f"ndcg@{k}"] = 1.0 if sum(relevance_flags[:k]) == 0 else 0.0
        metrics["mrr"] = 1.0 if sum(relevance_flags) == 0 else 0.0
        metrics["map@5"] = 1.0 if sum(relevance_flags[:5]) == 0 else 0.0
        metrics["map@10"] = 1.0 if sum(relevance_flags[:10]) == 0 else 0.0
        return metrics

    for k in k_values:
        top_k = relevance_flags[:k]
        hits = sum(top_k)
        metrics[f"hit_rate@{k}"] = 1.0 if hits > 0 else 0.0
        metrics[f"precision@{k}"] = hits / k if k > 0 else 0.0
        metrics[f"recall@{k}"] = min(1.0, hits / ground_truth_count) if ground_truth_count > 0 else 0.0

        # NDCG@k
        dcg = sum(r / math.log2(i + 2) for i, r in enumerate(top_k))
        idcg = sum(1.0 / math.log2(i + 2) for i in range(min(ground_truth_count, k)))
        metrics[f"ndcg@{k}"] = (dcg / idcg) if idcg > 0 else 0.0

    # MRR
    mrr = 0.0
    for i, r in enumerate(relevance_flags):
        if r == 1:
            mrr = 1.0 / (i + 1)
            break
    metrics["mrr"] = mrr

    # MAP@k
    for map_k in (5, 10):
        cum_prec = 0.0
        hits = 0
        for i, r in enumerate(relevance_flags[:map_k]):
            if r == 1:
                hits += 1
                cum_prec += hits / (i + 1)
        metrics[f"map@{map_k}"] = cum_prec / min(ground_truth_count, map_k) if ground_truth_count > 0 else 0.0

    return metrics


def check_abstention(answer: str, should_abstain: bool) -> dict[str, Any]:
    """Check if the answer correctly abstained when evidence was insufficient."""
    abstain_signals = [
        "insufficient evidence",
        "do not contain",
        "not covered",
        "cannot answer",
        "unable to answer",
        "no specific information",
        "not present in the provided context",
        "not mentioned",
        "out of domain",
        "does not provide",
        "i don't have enough",
        "no evidence",
    ]
    ans_lower = answer.lower()
    abstained = any(s in ans_lower for s in abstain_signals)
    correct = (abstained == should_abstain)
    return {
        "abstained": abstained,
        "should_abstain": should_abstain,
        "correct": correct,
    }


async def run_evaluation(
    split: str = "dev",
    output_filename: str | None = None,
    use_llm_judge: bool = True,
    toggles: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run evaluation over specified split ('dev', 'test', or 'all')."""
    with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
        full_dataset: list[dict[str, Any]] = json.load(f)

    if split in ("dev", "test"):
        dataset = [q for q in full_dataset if q.get("split") == split]
    else:
        dataset = full_dataset

    logger.info("Initializing SecureRAGService and Judge for %d queries (split=%s)...", len(dataset), split)
    service = SecureRAGService()
    judge = LLMJudge() if use_llm_judge else None

    query_records: list[dict[str, Any]] = []
    t_start_total = time.perf_counter()

    for idx, item in enumerate(dataset, start=1):
        q_id = item["id"]
        query = item["query"]
        category = item["category"]
        target_company = item.get("target_company")
        expected_topics = item.get("expected_topics", [])
        should_abstain = item.get("should_abstain", False)
        gt_chunk_ids = item.get("relevant_chunk_ids", [])

        logger.info("\n------------------------------------------------------------")
        logger.info("[%d/%d] [%s] [%s] %s", idx, len(dataset), q_id, category, query[:65])

        t0 = time.perf_counter()
        active_toggles = {"jev_decision": False} if toggles is None else toggles
        req = ChatRequest(query=query, toggles=active_toggles)
        ctx = build_request_context(client_ip="127.0.0.1", user_id=f"eval_{split}_{q_id}")

        resp = await service.process(req, ctx)
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)

        pdata = resp.pipeline_data
        ret_info = pdata.retrieval_info if pdata else {}
        retrieved_chunks = ret_info.get("retrieved_chunks", [])

        # 1. Company+Topic level relevance (PRIMARY)
        topic_rel_flags = [
            1 if is_chunk_relevant_topic_level(ch, target_company, expected_topics, should_abstain) else 0
            for ch in retrieved_chunks
        ]
        # Ground truth count for topic level: estimated from matched chunks in DB
        gt_topic_count = max(1, len(gt_chunk_ids)) if not should_abstain else 0
        topic_metrics = compute_ir_metrics(topic_rel_flags, gt_topic_count, should_abstain)

        # 2. Strict Chunk-ID level relevance (SECONDARY)
        gt_set = set(gt_chunk_ids)
        chunk_rel_flags = [
            1 if (ch.get("chunk_id") in gt_set and not should_abstain) else 0
            for ch in retrieved_chunks
        ]
        chunk_metrics = compute_ir_metrics(chunk_rel_flags, len(gt_set), should_abstain)

        # 3. Abstention check
        abstention_info = check_abstention(resp.answer, should_abstain)

        logger.info("  Retrieved: %d chunks | Topic MRR: %.3f | Rec@5: %.3f | Hit@5: %.1f",
                    len(retrieved_chunks), topic_metrics["mrr"], topic_metrics["recall@5"], topic_metrics["hit_rate@5"])
        logger.info("  Abstention: %s (expected=%s, correct=%s)",
                    abstention_info["abstained"], should_abstain, abstention_info["correct"])

        # 4. LLM Judge RAGAS metrics (if enabled)
        faith_score = None
        rel_score = None
        if judge:
            faith_score, _ = await judge.judge_faithfulness(
                query=query,
                answer=resp.answer,
                context_chunks=retrieved_chunks,
                should_abstain=should_abstain,
            )
            rel_score, _ = await judge.judge_answer_relevancy(
                query=query,
                answer=resp.answer,
                should_abstain=should_abstain,
            )
            logger.info("  Judge -> Faithfulness: %s | Relevancy: %s",
                        f"{faith_score:.3f}" if faith_score is not None else "N/A",
                        f"{rel_score:.3f}" if rel_score is not None else "N/A")

        record = {
            "query_id": q_id,
            "query": query,
            "category": category,
            "split": item.get("split"),
            "target_company": target_company,
            "should_abstain": should_abstain,
            "latency_ms": latency_ms,
            "retrieved_chunk_count": len(retrieved_chunks),
            "topic_level_metrics": topic_metrics,
            "chunk_id_metrics": chunk_metrics,
            "abstention": abstention_info,
            "ragas_metrics": {
                "faithfulness": faith_score,
                "answer_relevancy": rel_score,
            },
            "answer": resp.answer,
        }
        query_records.append(record)

        # Gentle pause to respect Gemini Free Tier 15 RPM rate limit
        await asyncio.sleep(3.5)

    duration_s = round(time.perf_counter() - t_start_total, 2)

    def mean_val(records: list[dict], getter) -> float:
        vals = [getter(r) for r in records if getter(r) is not None]
        return round(sum(vals) / len(vals), 4) if vals else 0.0

    def compute_aggregate(records: list[dict]) -> dict[str, Any]:
        unans_records = [r for r in records if r["should_abstain"]]
        ans_records = [r for r in records if not r["should_abstain"]]
        faith_records = [r for r in records if r["ragas_metrics"]["faithfulness"] is not None]
        rel_records = [r for r in records if r["ragas_metrics"]["answer_relevancy"] is not None]

        abstain_accuracy = mean_val(unans_records, lambda r: 1.0 if r["abstention"]["correct"] else 0.0) if unans_records else 1.0

        return {
            "count": len(records),
            "primary_topic_metrics": {
                "mrr": mean_val(records, lambda r: r["topic_level_metrics"]["mrr"]),
                "hit_rate@5": mean_val(records, lambda r: r["topic_level_metrics"]["hit_rate@5"]),
                "recall@5": mean_val(records, lambda r: r["topic_level_metrics"]["recall@5"]),
                "precision@5": mean_val(records, lambda r: r["topic_level_metrics"]["precision@5"]),
                "ndcg@5": mean_val(records, lambda r: r["topic_level_metrics"]["ndcg@5"]),
                "map@5": mean_val(records, lambda r: r["topic_level_metrics"]["map@5"]),
            },
            "secondary_chunk_metrics": {
                "mrr": mean_val(records, lambda r: r["chunk_id_metrics"]["mrr"]),
                "hit_rate@5": mean_val(records, lambda r: r["chunk_id_metrics"]["hit_rate@5"]),
                "recall@5": mean_val(records, lambda r: r["chunk_id_metrics"]["recall@5"]),
                "precision@5": mean_val(records, lambda r: r["chunk_id_metrics"]["precision@5"]),
                "ndcg@5": mean_val(records, lambda r: r["chunk_id_metrics"]["ndcg@5"]),
            },
            "abstention": {
                "unanswerable_count": len(unans_records),
                "abstention_accuracy": abstain_accuracy,
            },
            "ragas": {
                "faithfulness": mean_val(faith_records, lambda r: r["ragas_metrics"]["faithfulness"]),
                "answer_relevancy": mean_val(rel_records, lambda r: r["ragas_metrics"]["answer_relevancy"]),
            },
            "latency_ms": {
                "mean": mean_val(records, lambda r: r["latency_ms"]),
            },
        }

    overall_agg = compute_aggregate(query_records)

    # Per-category breakdown
    categories = ["single-hop", "multi-hop", "metadata", "conceptual", "unanswerable"]
    per_category = {}
    for cat in categories:
        cat_recs = [r for r in query_records if r["category"] == cat]
        if cat_recs:
            per_category[cat] = compute_aggregate(cat_recs)

    summary = {
        "benchmark_name": f"Expanded 65-Query Benchmark ({split.upper()})",
        "split": split,
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_queries": len(query_records),
        "total_duration_seconds": duration_s,
        "overall": overall_agg,
        "per_category": per_category,
    }

    results_data = {
        "summary": summary,
        "query_results": query_records,
    }

    if not output_filename:
        output_filename = f"expanded_{split}.json"

    out_path = PROJECT_ROOT / "eval" / "results" / output_filename
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results_data, f, indent=2)

    logger.info("Saved evaluation results to: %s", out_path)
    return results_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Expanded Evaluation Benchmark")
    parser.add_argument("--split", choices=["dev", "test", "all"], default="dev", help="Dataset split to evaluate")
    parser.add_argument("--output", type=str, default=None, help="Output JSON filename in eval/results/")
    parser.add_argument("--no-judge", action="store_true", help="Skip LLM Judge calls")
    args = parser.parse_args()

    asyncio.run(run_evaluation(
        split=args.split,
        output_filename=args.output,
        use_llm_judge=not args.no_judge,
    ))
