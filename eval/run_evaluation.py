"""Evaluation runner for the expanded benchmark dataset (N=65).

Supports:
- Evaluation on 'dev' (45 queries), 'test' (20 queries), or 'all' (65 queries).
- Exact Chunk ID relevance (PRIMARY AUTHORITATIVE IR METRIC).
- Company + Topic level relevance (SECONDARY EXPLORATORY METRIC, strictly bounded NDCG <= 1.0).
- Complete IR metrics: MRR, HitRate@1/3/5/10, Recall@1/3/5/10, Precision@1/3/5/10, NDCG@1/3/5/10, MAP@5/10.
- Clean separation of answerable query retrieval metrics from unanswerable query metrics.
- Abstention metrics: Abstention Accuracy, False Answer Count, Inappropriate Abstention Count.
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
from eval.metrics import (
    compute_ranking_metrics,
    check_abstention,
    deduplicate_chunk_ids,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eval.suite")

BENCHMARK_PATH = PROJECT_ROOT / "eval" / "benchmark_65.json"


def is_chunk_relevant_topic_level(
    chunk: dict[str, Any],
    target_company: str | None,
    expected_topics: list[str],
    should_abstain: bool,
) -> bool:
    """Determine if a retrieved chunk matches at the Company + Topic level."""
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


def compute_topic_metrics(
    relevance_flags: list[int],
    ground_truth_count: int,
    should_abstain: bool,
    k_values: tuple[int, ...] = (1, 3, 5, 10),
) -> dict[str, float | None]:
    """Exploratory topic-level metric with mathematically bounded NDCG."""
    if should_abstain or ground_truth_count == 0:
        return {
            "mrr": None,
            "hit_rate@1": None,
            "hit_rate@3": None,
            "hit_rate@5": None,
            "hit_rate@10": None,
            "precision@1": None,
            "precision@3": None,
            "precision@5": None,
            "precision@10": None,
            "recall@1": None,
            "recall@3": None,
            "recall@5": None,
            "recall@10": None,
            "ndcg@1": None,
            "ndcg@3": None,
            "ndcg@5": None,
            "ndcg@10": None,
            "map@5": None,
            "map@10": None,
        }

    hits_total = sum(relevance_flags)
    effective_gt = max(ground_truth_count, hits_total)

    metrics: dict[str, float | None] = {}
    for k in k_values:
        top_k = relevance_flags[:k]
        hits = sum(top_k)
        metrics[f"hit_rate@{k}"] = 1.0 if hits > 0 else 0.0
        metrics[f"precision@{k}"] = round(hits / k, 4)
        metrics[f"recall@{k}"] = round(min(1.0, hits / effective_gt), 4)

        dcg = sum(r / math.log2(i + 2) for i, r in enumerate(top_k))
        idcg = sum(1.0 / math.log2(i + 2) for i in range(min(effective_gt, k)))
        metrics[f"ndcg@{k}"] = round(min(1.0, dcg / idcg), 4) if idcg > 0 else 0.0

    first_hit = next((i + 1 for i, r in enumerate(relevance_flags) if r == 1), 0)
    metrics["mrr"] = round(1.0 / first_hit, 4) if first_hit > 0 else 0.0

    for map_k in (5, 10):
        cum_prec = 0.0
        hits = 0
        for i, r in enumerate(relevance_flags[:map_k]):
            if r == 1:
                hits += 1
                cum_prec += hits / (i + 1)
        denom = min(effective_gt, map_k)
        metrics[f"map@{map_k}"] = round(cum_prec / denom, 4) if denom > 0 else 0.0

    return metrics


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
    service.warmup()
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

        # 1. Authoritative Chunk-ID level relevance (PRIMARY)
        retrieved_cids = [ch.get("chunk_id", "") for ch in retrieved_chunks if ch.get("chunk_id")]
        chunk_metrics = compute_ranking_metrics(
            retrieved_chunk_ids=retrieved_cids,
            ground_truth_chunk_ids=gt_chunk_ids if not should_abstain else [],
        )

        # 2. Exploratory Topic level relevance (SECONDARY)
        topic_rel_flags = [
            1 if is_chunk_relevant_topic_level(ch, target_company, expected_topics, should_abstain) else 0
            for ch in retrieved_chunks
        ]
        gt_topic_count = len(gt_chunk_ids) if not should_abstain else 0
        topic_metrics = compute_topic_metrics(topic_rel_flags, gt_topic_count, should_abstain)

        # 3. Abstention check
        abstention_info = check_abstention(resp.answer, should_abstain)

        mrr_str = f"{chunk_metrics['mrr']:.3f}" if chunk_metrics.get("mrr") is not None else "N/A"
        rec_str = f"{chunk_metrics['recall@5']:.3f}" if chunk_metrics.get("recall@5") is not None else "N/A"
        hit_str = f"{chunk_metrics['hit_rate@5']:.1f}" if chunk_metrics.get("hit_rate@5") is not None else "N/A"
        logger.info("  Retrieved: %d chunks | Chunk MRR: %s | Rec@5: %s | Hit@5: %s",
                    len(retrieved_chunks), mrr_str, rec_str, hit_str)
        logger.info("  Abstention: %s (expected=%s, status=%s)",
                    abstention_info["abstained"], should_abstain, abstention_info["status"])

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
            "primary_chunk_metrics": chunk_metrics,
            "secondary_topic_metrics": topic_metrics,
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

    def mean_val(records: list[dict], getter) -> float | None:
        vals = [getter(r) for r in records if getter(r) is not None]
        return round(sum(vals) / len(vals), 4) if vals else 0.0

    def compute_aggregate(records: list[dict]) -> dict[str, Any]:
        unans_records = [r for r in records if r["should_abstain"]]
        ans_records = [r for r in records if not r["should_abstain"]]
        faith_records = [r for r in records if r["ragas_metrics"]["faithfulness"] is not None]
        rel_records = [r for r in records if r["ragas_metrics"]["answer_relevancy"] is not None]

        correct_abstentions = sum(1 for r in unans_records if r["abstention"]["status"] == "CORRECT_ABSTENTION")
        abstain_accuracy = round(correct_abstentions / len(unans_records), 4) if unans_records else 1.0

        return {
            "total_count": len(records),
            "answerable_count": len(ans_records),
            "unanswerable_count": len(unans_records),
            "primary_chunk_metrics": {
                "mrr": mean_val(ans_records, lambda r: r["primary_chunk_metrics"]["mrr"]),
                "hit_rate@5": mean_val(ans_records, lambda r: r["primary_chunk_metrics"]["hit_rate@5"]),
                "recall@5": mean_val(ans_records, lambda r: r["primary_chunk_metrics"]["recall@5"]),
                "precision@5": mean_val(ans_records, lambda r: r["primary_chunk_metrics"]["precision@5"]),
                "ndcg@5": mean_val(ans_records, lambda r: r["primary_chunk_metrics"]["ndcg@5"]),
                "map@5": mean_val(ans_records, lambda r: r["primary_chunk_metrics"]["map@5"]),
            },
            "secondary_topic_metrics": {
                "mrr": mean_val(ans_records, lambda r: r["secondary_topic_metrics"]["mrr"]),
                "hit_rate@5": mean_val(ans_records, lambda r: r["secondary_topic_metrics"]["hit_rate@5"]),
                "recall@5": mean_val(ans_records, lambda r: r["secondary_topic_metrics"]["recall@5"]),
                "precision@5": mean_val(ans_records, lambda r: r["secondary_topic_metrics"]["precision@5"]),
                "ndcg@5": mean_val(ans_records, lambda r: r["secondary_topic_metrics"]["ndcg@5"]),
                "map@5": mean_val(ans_records, lambda r: r["secondary_topic_metrics"]["map@5"]),
            },
            "abstention": {
                "unanswerable_count": len(unans_records),
                "abstention_accuracy": abstain_accuracy,
                "false_answer_count": sum(1 for r in unans_records if r["abstention"]["status"] == "FALSE_ANSWER"),
                "inappropriate_abstention_count": sum(1 for r in ans_records if r["abstention"]["status"] == "INAPPROPRIATE_ABSTENTION"),
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
        output_filename = f"corrected_{split}_baseline.json"

    out_path = PROJECT_ROOT / "eval" / "results" / output_filename
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results_data, f, indent=2)

    logger.info("Saved corrected evaluation results to: %s", out_path)
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
