"""Phase 0: Run the existing 20-query benchmark and compute baseline metrics.

Evaluates the existing baseline RAG pipeline on the canonical 20-query benchmark:
- Retrieval metrics: MRR, Recall@1/3/5/10, Precision@1/3/5/10, NDCG@1/3/5/10, MAP@5/10, HitRate@1/3/5/10
- RAGAS metrics: Faithfulness (LLM Judge), Answer Relevancy (LLM Judge), Context Precision, Context Recall
- Retries transient LLM judge errors (429/503) with exponential backoff
- Logs judge failures and excludes them from averages instead of scoring as zero
- Saves complete results to eval/results/baseline.json
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import sys
import time
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
logger = logging.getLogger("eval.baseline")

DATASET_PATH = PROJECT_ROOT / "evaluation" / "jev_20" / "benchmark_dataset.json"
OUTPUT_FILE = PROJECT_ROOT / "eval" / "results" / "baseline.json"


def compute_retrieval_metrics(
    retrieved_chunk_ids: list[str],
    ground_truth_chunk_ids: list[str],
    k_values: tuple[int, ...] = (1, 3, 5, 10),
) -> dict[str, float]:
    """Calculate Recall@K, Precision@K, HitRate@K, MRR, MAP@K, NDCG@K."""
    metrics: dict[str, float] = {}
    gt_set = set(ground_truth_chunk_ids)

    if not gt_set:
        # Out-of-domain / unanswerable query (e.g. Q18)
        for k in k_values:
            metrics[f"recall@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
            metrics[f"precision@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
            metrics[f"hit_rate@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
            metrics[f"ndcg@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["mrr"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["map@5"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["map@10"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["context_precision"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["context_recall"] = 1.0 if not retrieved_chunk_ids else 0.0
        return metrics

    rel_flags = [1 if cid in gt_set else 0 for cid in retrieved_chunk_ids]

    for k in k_values:
        top_k_rel = rel_flags[:k]
        hits_at_k = sum(top_k_rel)
        metrics[f"hit_rate@{k}"] = 1.0 if hits_at_k > 0 else 0.0
        metrics[f"precision@{k}"] = hits_at_k / k if k > 0 else 0.0
        metrics[f"recall@{k}"] = min(1.0, hits_at_k / len(gt_set)) if len(gt_set) > 0 else 0.0

        # NDCG@K
        dcg = sum(r / math.log2(i + 2) for i, r in enumerate(top_k_rel))
        idcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(gt_set), k)))
        metrics[f"ndcg@{k}"] = (dcg / idcg) if idcg > 0 else 0.0

    # MRR (Mean Reciprocal Rank)
    mrr = 0.0
    for i, r in enumerate(rel_flags):
        if r == 1:
            mrr = 1.0 / (i + 1)
            break
    metrics["mrr"] = mrr

    # MAP@5 & MAP@10
    for map_k in (5, 10):
        cum_prec = 0.0
        hits = 0
        for i, r in enumerate(rel_flags[:map_k]):
            if r == 1:
                hits += 1
                cum_prec += hits / (i + 1)
        metrics[f"map@{map_k}"] = cum_prec / min(len(gt_set), map_k) if gt_set and map_k > 0 else 0.0

    # Context Precision & Context Recall
    total_retrieved = len(retrieved_chunk_ids)
    total_hits = sum(rel_flags)
    metrics["context_precision"] = total_hits / total_retrieved if total_retrieved > 0 else 0.0
    metrics["context_recall"] = total_hits / len(gt_set) if len(gt_set) > 0 else 0.0

    return metrics


async def run_baseline_evaluation() -> dict[str, Any]:
    """Execute baseline evaluation across all 20 canonical queries."""
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset: list[dict[str, Any]] = json.load(f)

    logger.info("Initializing SecureRAGService and LLMJudge...")
    service = SecureRAGService()
    judge = LLMJudge()

    query_records: list[dict[str, Any]] = []

    logger.info("Starting Baseline Evaluation across %d benchmark queries...", len(dataset))
    t_suite_start = time.perf_counter()

    for idx, item in enumerate(dataset, start=1):
        q_id = item["id"]
        query = item["query"]
        category = item.get("category", "")
        ground_truth_chunks = item.get("relevant_chunk_ids", [])
        ref_answer = item.get("reference_answer", "")
        should_abstain = item.get("should_abstain", False)

        logger.info("\n------------------------------------------------------------")
        logger.info("[%d/%d] [%s] %s (%s)", idx, len(dataset), q_id, query[:65], category)

        # Run RAG query
        t_start = time.perf_counter()
        req = ChatRequest(query=query, toggles={"jev_decision": False})
        ctx = build_request_context(client_ip="127.0.0.1", user_id=f"eval_baseline_{q_id}")

        resp = await service.process(req, ctx)
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)

        pdata = resp.pipeline_data
        ret_info = pdata.retrieval_info if pdata else {}
        retrieved_chunks = ret_info.get("retrieved_chunks", [])
        retrieved_cids = [c.get("chunk_id", "") for c in retrieved_chunks if c.get("chunk_id")]

        # Compute retrieval metrics
        ret_metrics = compute_retrieval_metrics(retrieved_cids, ground_truth_chunks)

        logger.info("  Retrieval: %d chunks | MRR: %.3f | Rec@5: %.3f | Hit@5: %.1f",
                    len(retrieved_cids), ret_metrics["mrr"], ret_metrics["recall@5"], ret_metrics["hit_rate@5"])

        # Run LLM judge for Faithfulness
        logger.info("  Judging Faithfulness...")
        try:
            faith_score, faith_details = await judge.judge_faithfulness(
                query=query,
                answer=resp.answer,
                context_chunks=retrieved_chunks,
                should_abstain=should_abstain,
            )
        except Exception as exc:
            logger.error("  Judge faithfulness crashed with exception: %s", exc)
            faith_score, faith_details = None, {"error": str(exc)}

        # Run LLM judge for Answer Relevancy
        logger.info("  Judging Answer Relevancy...")
        try:
            rel_score, rel_details = await judge.judge_answer_relevancy(
                query=query,
                answer=resp.answer,
                should_abstain=should_abstain,
            )
        except Exception as exc:
            logger.error("  Judge answer relevancy crashed with exception: %s", exc)
            rel_score, rel_details = None, {"error": str(exc)}

        logger.info("  Judge results -> Faithfulness: %s | Answer Relevancy: %s",
                    f"{faith_score:.3f}" if faith_score is not None else "FAILED",
                    f"{rel_score:.3f}" if rel_score is not None else "FAILED")

        record = {
            "query_id": q_id,
            "query": query,
            "category": category,
            "target_company": item.get("target_company"),
            "should_abstain": should_abstain,
            "latency_ms": latency_ms,
            "retrieved_chunk_ids": retrieved_cids,
            "ground_truth_chunk_ids": ground_truth_chunks,
            "retrieval_metrics": ret_metrics,
            "ragas_metrics": {
                "faithfulness": faith_score,
                "answer_relevancy": rel_score,
                "context_precision": ret_metrics["context_precision"],
                "context_recall": ret_metrics["context_recall"],
            },
            "judge_details": {
                "faithfulness": faith_details,
                "answer_relevancy": rel_details,
            },
            "answer": resp.answer,
            "reference_answer": ref_answer,
        }
        query_records.append(record)

        # Gentle pause between queries to respect Gemini Free Tier 15 RPM limit
        await asyncio.sleep(3.5)

    total_duration_s = round(time.perf_counter() - t_suite_start, 2)

    # Compute aggregate summary metrics
    def mean_val(records: list[dict], metric_getter) -> float:
        vals = [metric_getter(r) for r in records if metric_getter(r) is not None]
        return round(sum(vals) / len(vals), 4) if vals else 0.0

    valid_faith_records = [r for r in query_records if r["ragas_metrics"]["faithfulness"] is not None]
    valid_rel_records = [r for r in query_records if r["ragas_metrics"]["answer_relevancy"] is not None]

    summary = {
        "benchmark_name": "Canonical 20-Query Placement RAG Benchmark",
        "phase": "PHASE 0: Baseline",
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_queries": len(query_records),
        "total_duration_seconds": total_duration_s,
        "llm_judge": {
            "model": judge._model,
            "total_judge_calls": judge.total_judge_calls,
            "failed_judge_calls": judge.failed_judge_calls,
            "retries_performed": judge.retry_count,
            "success_rate": round(
                (judge.total_judge_calls - judge.failed_judge_calls) / max(1, judge.total_judge_calls), 4
            ),
        },
        "retrieval_metrics": {
            "mrr": mean_val(query_records, lambda r: r["retrieval_metrics"]["mrr"]),
            "recall@1": mean_val(query_records, lambda r: r["retrieval_metrics"]["recall@1"]),
            "recall@3": mean_val(query_records, lambda r: r["retrieval_metrics"]["recall@3"]),
            "recall@5": mean_val(query_records, lambda r: r["retrieval_metrics"]["recall@5"]),
            "recall@10": mean_val(query_records, lambda r: r["retrieval_metrics"]["recall@10"]),
            "precision@1": mean_val(query_records, lambda r: r["retrieval_metrics"]["precision@1"]),
            "precision@3": mean_val(query_records, lambda r: r["retrieval_metrics"]["precision@3"]),
            "precision@5": mean_val(query_records, lambda r: r["retrieval_metrics"]["precision@5"]),
            "precision@10": mean_val(query_records, lambda r: r["retrieval_metrics"]["precision@10"]),
            "ndcg@1": mean_val(query_records, lambda r: r["retrieval_metrics"]["ndcg@1"]),
            "ndcg@3": mean_val(query_records, lambda r: r["retrieval_metrics"]["ndcg@3"]),
            "ndcg@5": mean_val(query_records, lambda r: r["retrieval_metrics"]["ndcg@5"]),
            "ndcg@10": mean_val(query_records, lambda r: r["retrieval_metrics"]["ndcg@10"]),
            "map@5": mean_val(query_records, lambda r: r["retrieval_metrics"]["map@5"]),
            "map@10": mean_val(query_records, lambda r: r["retrieval_metrics"]["map@10"]),
            "hit_rate@1": mean_val(query_records, lambda r: r["retrieval_metrics"]["hit_rate@1"]),
            "hit_rate@3": mean_val(query_records, lambda r: r["retrieval_metrics"]["hit_rate@3"]),
            "hit_rate@5": mean_val(query_records, lambda r: r["retrieval_metrics"]["hit_rate@5"]),
            "hit_rate@10": mean_val(query_records, lambda r: r["retrieval_metrics"]["hit_rate@10"]),
            "context_precision": mean_val(query_records, lambda r: r["retrieval_metrics"]["context_precision"]),
            "context_recall": mean_val(query_records, lambda r: r["retrieval_metrics"]["context_recall"]),
        },
        "ragas_metrics": {
            "faithfulness": mean_val(valid_faith_records, lambda r: r["ragas_metrics"]["faithfulness"]),
            "answer_relevancy": mean_val(valid_rel_records, lambda r: r["ragas_metrics"]["answer_relevancy"]),
            "context_precision": mean_val(query_records, lambda r: r["ragas_metrics"]["context_precision"]),
            "context_recall": mean_val(query_records, lambda r: r["ragas_metrics"]["context_recall"]),
            "faithfulness_evaluated_count": len(valid_faith_records),
            "relevancy_evaluated_count": len(valid_rel_records),
        },
        "latency_metrics": {
            "mean_ms": mean_val(query_records, lambda r: r["latency_ms"]),
        },
    }

    final_output = {
        "summary": summary,
        "query_results": query_records,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=2)

    logger.info("Saved baseline evaluation results to: %s", OUTPUT_FILE)
    return final_output


if __name__ == "__main__":
    result = asyncio.run(run_baseline_evaluation())
    s = result["summary"]
    print("\n" + "=" * 60)
    print("PHASE 0 BASELINE RESULTS SUMMARY (N=20)")
    print("=" * 60)
    rm = s["retrieval_metrics"]
    rag = s["ragas_metrics"]
    j = s["llm_judge"]
    print(f"MRR:                 {rm['mrr']:.4f}")
    print(f"HitRate@5:           {rm['hit_rate@5']:.4f}")
    print(f"Recall@1:            {rm['recall@1']:.4f}")
    print(f"Recall@3:            {rm['recall@3']:.4f}")
    print(f"Recall@5:            {rm['recall@5']:.4f}")
    print(f"Recall@10:           {rm['recall@10']:.4f}")
    print(f"Precision@1:         {rm['precision@1']:.4f}")
    print(f"Precision@3:         {rm['precision@3']:.4f}")
    print(f"Precision@5:         {rm['precision@5']:.4f}")
    print(f"Precision@10:        {rm['precision@10']:.4f}")
    print(f"NDCG@1:              {rm['ndcg@1']:.4f}")
    print(f"NDCG@3:              {rm['ndcg@3']:.4f}")
    print(f"NDCG@5:              {rm['ndcg@5']:.4f}")
    print(f"NDCG@10:             {rm['ndcg@10']:.4f}")
    print(f"MAP@5:               {rm['map@5']:.4f}")
    print(f"MAP@10:              {rm['map@10']:.4f}")
    print("-" * 60)
    print(f"Faithfulness (LLM):  {rag['faithfulness']:.4f}")
    print(f"Answer Relevancy:    {rag['answer_relevancy']:.4f}")
    print(f"Context Precision:   {rag['context_precision']:.4f}")
    print(f"Context Recall:      {rag['context_recall']:.4f}")
    print("-" * 60)
    print(f"Judge Calls Total:   {j['total_judge_calls']}")
    print(f"Judge Calls Failed:  {j['failed_judge_calls']}")
    print(f"Judge Retries Done:  {j['retries_performed']}")
    print("=" * 60)
