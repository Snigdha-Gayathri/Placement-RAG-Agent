"""Comprehensive, scientifically honest baseline evaluation runner for Agentic Placement RAG.

Executes the real existing system across the curated 55-query benchmark dataset.
Measures real multi-stage retrieval metrics, agent decisions, answer quality,
token usage, latencies, reliability, and cost without simulation or fabrication.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.models import ChatRequest
from backend.app.service import SecureRAGService, build_request_context, DASHBOARD_STORE
from backend.core.agent.tools import EvaluateEvidenceTool
from backend.core.retrieval.router import QueryRouter
from backend.core.vector_store.chroma import ChromaVectorStore
from backend.evaluation.metrics import RAGMetrics

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def compute_retrieval_metrics_at_k(retrieved_chunk_ids: list[str], ground_truth_chunk_ids: list[str], k_values=(1, 3, 5, 10)) -> dict[str, float]:
    """Calculate Recall@K, Precision@K, HitRate@K, MRR, MAP, NDCG@K, R-Precision."""
    metrics: dict[str, float] = {}
    gt_set = set(ground_truth_chunk_ids)

    if not gt_set:
        # If there are no relevant documents (e.g. out-of-domain or unsupported), retrieval should be empty
        for k in k_values:
            metrics[f"recall@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
            metrics[f"precision@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
            metrics[f"hit_rate@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
            metrics[f"ndcg@{k}"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["mrr"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["map"] = 1.0 if not retrieved_chunk_ids else 0.0
        metrics["r_precision"] = 1.0 if not retrieved_chunk_ids else 0.0
        return metrics

    # Binary relevance flags
    rel_flags = [1 if cid in gt_set else 0 for cid in retrieved_chunk_ids]

    # Metrics at each K
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

    # MAP (Mean Average Precision)
    cum_prec = 0.0
    hits = 0
    for i, r in enumerate(rel_flags):
        if r == 1:
            hits += 1
            cum_prec += hits / (i + 1)
    metrics["map"] = (cum_prec / min(len(gt_set), len(rel_flags))) if (hits > 0 and len(rel_flags) > 0) else 0.0

    # R-Precision: Precision at R, where R = len(gt_set)
    r_val = len(gt_set)
    r_flags = rel_flags[:r_val]
    metrics["r_precision"] = sum(r_flags) / r_val if r_val > 0 else 0.0

    return metrics


def calculate_percentiles(values: list[float]) -> dict[str, float]:
    """Calculate mean, median (P50), P90, P95, P99, min, max for a list of numbers."""
    if not values:
        return {"mean": 0.0, "median": 0.0, "p50": 0.0, "p90": 0.0, "p95": 0.0, "p99": 0.0, "min": 0.0, "max": 0.0, "n": 0}
    s = sorted(values)
    n = len(s)

    def p(pct: float) -> float:
        idx = max(0, min(n - 1, int(n * pct)))
        return s[idx]

    return {
        "mean": round(sum(s) / n, 2),
        "median": round(p(0.50), 2),
        "p50": round(p(0.50), 2),
        "p90": round(p(0.90), 2),
        "p95": round(p(0.95), 2),
        "p99": round(p(0.99), 2),
        "min": round(s[0], 2),
        "max": round(s[-1], 2),
        "n": n,
    }


async def evaluate_standalone_retrieval(service: SecureRAGService, query: str, meta_filters: dict[str, Any] | None) -> dict[str, list[str]]:
    """Fetch raw retrieval candidate IDs from BM25, Dense, Hybrid, and Cross-Encoder."""
    # 1. BM25
    bm25_res = await service.bm25_retriever.retrieve(query, top_k=15, metadata_filters=meta_filters)
    bm25_ids = [c.chunk_id for c in bm25_res.chunks]

    # 2. Dense
    dense_res = await service.dense_retriever.retrieve(query, top_k=15, metadata_filters=meta_filters)
    dense_ids = [c.chunk_id for c in dense_res.chunks]

    # 3. Hybrid RRF
    hybrid_res = await service.hybrid_retriever.retrieve(query, top_k=15, metadata_filters=meta_filters)
    hybrid_ids = [c.chunk_id for c in hybrid_res.chunks]

    # 4. Cross-Encoder Reranking
    rerank_ids = []
    if hybrid_res.chunks:
        rerank_res = service.reranker.rerank(query, hybrid_res.chunks, top_k=8)
        rerank_ids = [c.chunk_id for c in rerank_res.chunks]

    return {
        "bm25": bm25_ids,
        "dense": dense_ids,
        "hybrid": hybrid_ids,
        "reranked": rerank_ids,
    }


async def run_baseline_benchmark():
    dataset_path = PROJECT_ROOT / "evaluation" / "datasets" / "benchmark_dataset.json"
    if not dataset_path.exists():
        logger.error("Dataset not found at %s. Run create_datasets.py first.", dataset_path)
        return

    with open(dataset_path, "r", encoding="utf-8") as f:
        benchmark_dataset = json.load(f)

    logger.info("Loaded %d test cases for baseline evaluation.", len(benchmark_dataset))

    service = SecureRAGService()
    rag_metrics_engine = RAGMetrics()
    eval_evidence_tool = EvaluateEvidenceTool()

    raw_query_results = []
    stage_retrieval_metrics = {"bm25": [], "dense": [], "hybrid": [], "reranked": []}
    latencies_by_stage = defaultdict(list)
    token_usage_records = []
    agent_decision_records = []
    answer_quality_records = []
    reliability_records = []

    # Gemini 2.5 Flash pricing: $0.075 / 1M input tokens, $0.30 / 1M output tokens
    INPUT_COST_PER_MILLION = 0.075
    OUTPUT_COST_PER_MILLION = 0.30

    start_eval_time = time.time()

    for idx, tc in enumerate(benchmark_dataset, start=1):
        q_id = tc["id"]
        query = tc["query"]
        category = tc["category"]
        should_abstain = tc.get("should_abstain", False)
        ground_truth_chunk_ids = tc.get("relevant_chunk_ids", [])
        expected_keywords = tc.get("expected_answer_keywords", [])
        expected_route = tc.get("expected_route", "SINGLE_HOP")
        expected_company = tc.get("expected_company")
        expected_topics = tc.get("expected_topics", [])

        logger.info("[%d/%d] Evaluating %s (%s): '%s'", idx, len(benchmark_dataset), q_id, category, query[:60])

        # Step A: Evaluate standalone retrieval components (BM25, Dense, Hybrid, Reranker)
        retrieval_stages = await evaluate_standalone_retrieval(service, query, {"company": expected_company} if expected_company else None)

        bm25_metrics = compute_retrieval_metrics_at_k(retrieval_stages["bm25"], ground_truth_chunk_ids)
        dense_metrics = compute_retrieval_metrics_at_k(retrieval_stages["dense"], ground_truth_chunk_ids)
        hybrid_metrics = compute_retrieval_metrics_at_k(retrieval_stages["hybrid"], ground_truth_chunk_ids)
        rerank_metrics = compute_retrieval_metrics_at_k(retrieval_stages["reranked"], ground_truth_chunk_ids)

        stage_retrieval_metrics["bm25"].append(bm25_metrics)
        stage_retrieval_metrics["dense"].append(dense_metrics)
        stage_retrieval_metrics["hybrid"].append(hybrid_metrics)
        stage_retrieval_metrics["reranked"].append(rerank_metrics)

        # Step B: Execute full end-to-end service with security, agent, and generation
        ctx = build_request_context(client_ip="127.0.0.1", user_id="baseline_evaluator")
        req = ChatRequest(query=query)

        t0_req = time.perf_counter()
        is_success = True
        error_msg = ""
        chat_resp = None

        try:
            chat_resp = await service.process(req, ctx)
        except Exception as exc:
            is_success = False
            error_msg = str(exc)
            logger.warning("Query %s encountered exception: %s", q_id, exc)

        dur_e2e_ms = round((time.perf_counter() - t0_req) * 1000, 2)

        # Inspect pipeline data & dashboard store
        pdata = chat_resp.pipeline_data if chat_resp else None
        ddata = DASHBOARD_STORE.get(ctx.request_id)

        # 1. Latency Breakdown
        lat_record = {"e2e_ms": dur_e2e_ms}
        if pdata:
            for s in pdata.pipeline_stages:
                lat_record[f"{s.name}_ms"] = s.latency_ms
                latencies_by_stage[s.name].append(s.latency_ms)
        latencies_by_stage["end_to_end"].append(dur_e2e_ms)

        # 2. Agent Decision Metrics
        actual_route = pdata.query_info.get("route_type", "SINGLE_HOP") if pdata else "UNKNOWN"
        is_llm_bypassed = pdata.agent_info.get("llm_invoked") is False or "Bypassed" in pdata.query_info.get("routing_decision", "") if pdata else False
        multi_hop_used = pdata.feature_toggles.get("multi_hop_retrieval", False) if pdata else False
        hyde_used = pdata.feature_toggles.get("hyde", False) if pdata else False
        rewrite_used = pdata.query_info.get("is_followup", False) if pdata else False
        meta_filter_used = bool(pdata.query_info.get("metadata_filters")) if pdata else False
        evidence_sufficient = pdata.security_info.get("grounding_passed", True) if pdata else False

        # Ground truth decision criteria:
        # Route accuracy: actual route matches expected route (or SINGLE_HOP/CONCEPTUAL alignment)
        route_correct = (
            actual_route == expected_route
            or (expected_route == "SINGLE_HOP" and actual_route in ["SINGLE_HOP", "HYBRID"])
            or (expected_route == "CONCEPTUAL" and actual_route in ["CONCEPTUAL", "HYBRID", "DENSE"])
        )

        unnecessary_retrieval = (expected_route in ["METADATA_DIRECT", "OUT_OF_DOMAIN"]) and (pdata.retrieval_info.get("total_candidates", 0) > 0 if pdata else False)
        unnecessary_rewrite = (not rewrite_used and False) or (rewrite_used and category != "Query Rewriting")
        unnecessary_hyde = hyde_used and tc.get("required_retrieval_behavior") != "HyDE"
        unnecessary_multihop = multi_hop_used and tc.get("expected_hop_count", 1) <= 1

        agent_dec = {
            "query_id": q_id,
            "actual_route": actual_route,
            "expected_route": expected_route,
            "route_correct": route_correct,
            "is_llm_bypassed": is_llm_bypassed,
            "multi_hop_used": multi_hop_used,
            "unnecessary_multihop": unnecessary_multihop,
            "hyde_used": hyde_used,
            "unnecessary_hyde": unnecessary_hyde,
            "rewrite_used": rewrite_used,
            "unnecessary_rewrite": unnecessary_rewrite,
            "meta_filter_used": meta_filter_used,
            "evidence_sufficient": evidence_sufficient,
            "iterations": pdata.agent_info.get("iterations", 1) if pdata else 1,
            "steps_count": len(pdata.agent_info.get("reasoning_trace", [])) if pdata else 0,
        }
        agent_decision_records.append(agent_dec)

        # 3. Answer Quality & Safety
        answer = chat_resp.answer if chat_resp else ""
        answer_lower = answer.lower()

        # Keyword coverage
        keyword_hits = sum(1 for kw in expected_keywords if kw.lower() in answer_lower)
        keyword_coverage = keyword_hits / max(1, len(expected_keywords))

        # Abstention accuracy
        is_abstained = (
            "not indexed" in answer_lower
            or "unable to answer" in answer_lower
            or "outside the scope" in answer_lower
            or "evidence sufficiency notice" in answer_lower
        )
        abstention_correct = (should_abstain and is_abstained) or (not should_abstain and not is_abstained)

        # Faithfulness and Grounding
        faithfulness = pdata.metrics_info.get("faithfulness", 0.0) if (pdata and pdata.metrics_info) else 0.0
        groundedness = pdata.metrics_info.get("groundedness", 0.0) if (pdata and pdata.metrics_info) else 0.0
        hallucination_detected = pdata.security_info.get("hallucination_detected", False) if pdata else False

        quality = {
            "query_id": q_id,
            "answer_word_count": len(answer.split()),
            "keyword_coverage": round(keyword_coverage, 3),
            "should_abstain": should_abstain,
            "is_abstained": is_abstained,
            "abstention_correct": abstention_correct,
            "faithfulness": faithfulness,
            "groundedness": groundedness,
            "hallucination_detected": hallucination_detected,
        }
        answer_quality_records.append(quality)

        # 4. Token & Cost Telemetry
        gen_info = pdata.generation_info if pdata else {}
        token_usage = gen_info.get("token_usage", {}) if isinstance(gen_info, dict) else getattr(gen_info, "token_usage", {})
        inp_tokens = token_usage.get("prompt_tokens", 0)
        out_tokens = token_usage.get("completion_tokens", 0)

        # Estimate tokens if not explicitly returned by API
        if inp_tokens == 0 and chat_resp:
            ctx_text = pdata.generation_info.get("user_prompt", "") if isinstance(pdata.generation_info, dict) else ""
            inp_tokens = len(ctx_text.split()) * 4 // 3
            out_tokens = len(answer.split()) * 4 // 3

        total_tokens = inp_tokens + out_tokens
        query_cost = (inp_tokens / 1_000_000 * INPUT_COST_PER_MILLION) + (out_tokens / 1_000_000 * OUTPUT_COST_PER_MILLION)

        token_rec = {
            "query_id": q_id,
            "input_tokens": inp_tokens,
            "output_tokens": out_tokens,
            "total_tokens": total_tokens,
            "llm_calls": 0 if is_llm_bypassed else 1,
            "embedding_calls": 1 if pdata and pdata.feature_toggles.get("dense_retrieval") else 0,
            "reranker_calls": 1 if pdata and pdata.feature_toggles.get("cross_encoder_reranking") else 0,
            "estimated_cost_usd": round(query_cost, 6),
        }
        token_usage_records.append(token_rec)

        # 5. Reliability record
        retrieved_count = pdata.retrieval_info.get("final_count", 0) if pdata else 0
        rel_rec = {
            "query_id": q_id,
            "is_success": is_success,
            "empty_retrieval": (retrieved_count == 0 and not should_abstain and not is_llm_bypassed),
            "error": error_msg,
        }
        reliability_records.append(rel_rec)

        # Full record
        raw_query_results.append({
            "test_case": tc,
            "retrieval_candidate_ids": retrieval_stages,
            "retrieval_metrics": {
                "bm25": bm25_metrics,
                "dense": dense_metrics,
                "hybrid": hybrid_metrics,
                "reranked": rerank_metrics,
            },
            "agent_decisions": agent_dec,
            "quality": quality,
            "tokens_and_cost": token_rec,
            "latency": lat_record,
            "reliability": rel_rec,
            "answer_preview": answer[:300].replace("\n", " "),
        })

    eval_duration_sec = round(time.time() - start_eval_time, 2)
    logger.info("Completed baseline evaluation of %d queries in %.2fs.", len(benchmark_dataset), eval_duration_sec)

    # ── AGGREGATE COMPUTATION ───────────────────────────────────────────────
    def avg_metric(m_list: list[dict[str, float]], key: str) -> float:
        vals = [m[key] for m in m_list if key in m]
        return round(sum(vals) / max(1, len(vals)), 4) if vals else 0.0

    aggregated_retrieval: dict[str, Any] = {}
    for stage in ["bm25", "dense", "hybrid", "reranked"]:
        m_list = stage_retrieval_metrics[stage]
        aggregated_retrieval[stage] = {
            "recall@1": avg_metric(m_list, "recall@1"),
            "recall@3": avg_metric(m_list, "recall@3"),
            "recall@5": avg_metric(m_list, "recall@5"),
            "recall@10": avg_metric(m_list, "recall@10"),
            "precision@1": avg_metric(m_list, "precision@1"),
            "precision@3": avg_metric(m_list, "precision@3"),
            "precision@5": avg_metric(m_list, "precision@5"),
            "precision@10": avg_metric(m_list, "precision@10"),
            "hit_rate@1": avg_metric(m_list, "hit_rate@1"),
            "hit_rate@3": avg_metric(m_list, "hit_rate@3"),
            "hit_rate@5": avg_metric(m_list, "hit_rate@5"),
            "hit_rate@10": avg_metric(m_list, "hit_rate@10"),
            "mrr": avg_metric(m_list, "mrr"),
            "map": avg_metric(m_list, "map"),
            "ndcg@3": avg_metric(m_list, "ndcg@3"),
            "ndcg@5": avg_metric(m_list, "ndcg@5"),
            "ndcg@10": avg_metric(m_list, "ndcg@10"),
            "r_precision": avg_metric(m_list, "r_precision"),
        }

    # Aggregate Agent Decisions
    total_q = len(benchmark_dataset)
    routing_acc = sum(1 for d in agent_decision_records if d["route_correct"]) / total_q
    llm_bypass_rate = sum(1 for d in agent_decision_records if d["is_llm_bypassed"]) / total_q
    unnecessary_retrieval_rate = sum(1 for d in agent_decision_records if d["unnecessary_multihop"] or d["unnecessary_hyde"] or d["unnecessary_rewrite"]) / total_q
    avg_agent_steps = sum(d["steps_count"] for d in agent_decision_records) / total_q

    # Aggregate Answer Quality
    avg_keyword_coverage = sum(q["keyword_coverage"] for q in answer_quality_records) / total_q
    abstention_acc = sum(1 for q in answer_quality_records if q["abstention_correct"]) / total_q
    avg_faithfulness = sum(q["faithfulness"] for q in answer_quality_records) / total_q
    avg_groundedness = sum(q["groundedness"] for q in answer_quality_records) / total_q
    hallucination_rate = sum(1 for q in answer_quality_records if q["hallucination_detected"]) / total_q

    # Aggregate Tokens & Cost
    total_inp_tokens = sum(t["input_tokens"] for t in token_usage_records)
    total_out_tokens = sum(t["output_tokens"] for t in token_usage_records)
    total_tokens = sum(t["total_tokens"] for t in token_usage_records)
    total_cost_usd = sum(t["estimated_cost_usd"] for t in token_usage_records)
    avg_cost_per_query = total_cost_usd / total_q
    cost_per_100_queries = avg_cost_per_query * 100

    # Aggregate Latencies
    aggregated_latencies = {
        stage_name: calculate_percentiles(vals)
        for stage_name, vals in latencies_by_stage.items()
    }

    # Aggregate Reliability
    success_rate = sum(1 for r in reliability_records if r["is_success"]) / total_q
    empty_retrieval_rate = sum(1 for r in reliability_records if r["empty_retrieval"]) / total_q

    # Category breakdown
    category_metrics = defaultdict(lambda: {"count": 0, "mrr": [], "ndcg@5": [], "keyword_coverage": [], "e2e_latency": []})
    for r in raw_query_results:
        cat = r["test_case"]["category"]
        category_metrics[cat]["count"] += 1
        category_metrics[cat]["mrr"].append(r["retrieval_metrics"]["reranked"]["mrr"])
        category_metrics[cat]["ndcg@5"].append(r["retrieval_metrics"]["reranked"]["ndcg@5"])
        category_metrics[cat]["keyword_coverage"].append(r["quality"]["keyword_coverage"])
        category_metrics[cat]["e2e_latency"].append(r["latency"]["e2e_ms"])

    aggregated_categories = {}
    for cat, data in category_metrics.items():
        n = data["count"]
        aggregated_categories[cat] = {
            "query_count": n,
            "avg_mrr": round(sum(data["mrr"]) / n, 4),
            "avg_ndcg@5": round(sum(data["ndcg@5"]) / n, 4),
            "avg_keyword_coverage": round(sum(data["keyword_coverage"]) / n, 4),
            "avg_latency_ms": round(sum(data["e2e_latency"]) / n, 2),
        }

    aggregated_report = {
        "metadata": {
            "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "total_queries_evaluated": total_q,
            "evaluation_duration_seconds": eval_duration_sec,
            "corpus_chunks": len(service.chroma_store.get_all_chunks()),
            "embedding_model": "models/embedding-001 (768-dim)",
            "generation_model": "gemini-2.5-flash",
            "reranker_model": "cross-encoder/ms-marco-MiniLM-L-6-v2",
            "system_type": "CURRENT BASELINE (Agentic Placement RAG)",
        },
        "retrieval_stage_metrics": aggregated_retrieval,
        "reranker_improvement": {
            "hybrid_mrr": aggregated_retrieval["hybrid"]["mrr"],
            "reranked_mrr": aggregated_retrieval["reranked"]["mrr"],
            "mrr_delta": round(aggregated_retrieval["reranked"]["mrr"] - aggregated_retrieval["hybrid"]["mrr"], 4),
            "hybrid_ndcg@5": aggregated_retrieval["hybrid"]["ndcg@5"],
            "reranked_ndcg@5": aggregated_retrieval["reranked"]["ndcg@5"],
            "ndcg@5_delta": round(aggregated_retrieval["reranked"]["ndcg@5"] - aggregated_retrieval["hybrid"]["ndcg@5"], 4),
        },
        "agent_decision_metrics": {
            "routing_accuracy": round(routing_acc, 4),
            "llm_bypass_rate": round(llm_bypass_rate, 4),
            "abstention_accuracy": round(abstention_acc, 4),
            "unnecessary_retrieval_rate": round(unnecessary_retrieval_rate, 4),
            "average_agent_steps": round(avg_agent_steps, 2),
        },
        "answer_quality_metrics": {
            "keyword_coverage": round(avg_keyword_coverage, 4),
            "faithfulness": round(avg_faithfulness, 4),
            "groundedness": round(avg_groundedness, 4),
            "hallucination_rate": round(hallucination_rate, 4),
            "abstention_accuracy": round(abstention_acc, 4),
        },
        "token_and_cost_metrics": {
            "total_input_tokens": total_inp_tokens,
            "total_output_tokens": total_out_tokens,
            "total_tokens": total_tokens,
            "average_tokens_per_query": round(total_tokens / total_q, 1),
            "total_cost_usd": round(total_cost_usd, 6),
            "cost_per_query_usd": round(avg_cost_per_query, 6),
            "cost_per_100_queries_usd": round(cost_per_100_queries, 4),
            "pricing_basis": "Gemini 2.5 Flash ($0.075 / 1M prompt, $0.30 / 1M completion)",
        },
        "latency_metrics": aggregated_latencies,
        "reliability_metrics": {
            "success_rate": round(success_rate, 4),
            "empty_retrieval_rate": round(empty_retrieval_rate, 4),
            "total_failures": sum(1 for r in reliability_records if not r["is_success"]),
        },
        "per_category_metrics": aggregated_categories,
    }

    # Save results to evaluation/baseline/
    out_dir = PROJECT_ROOT / "evaluation" / "baseline"
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(out_dir / "raw_results.json", "w", encoding="utf-8") as f:
        json.dump(raw_query_results, f, indent=2)

    with open(out_dir / "aggregated_baseline_metrics.json", "w", encoding="utf-8") as f:
        json.dump(aggregated_report, f, indent=2)

    with open(out_dir / "retrieval_stage_comparison.json", "w", encoding="utf-8") as f:
        json.dump(aggregated_retrieval, f, indent=2)

    with open(out_dir / "per_category_metrics.json", "w", encoding="utf-8") as f:
        json.dump(aggregated_categories, f, indent=2)

    logger.info("Successfully generated baseline evaluation reports in %s", out_dir)
    print("\n" + "=" * 80)
    print("BASELINE EVALUATION SUMMARY RESULTS")
    print("=" * 80)
    print(f"Total Queries Evaluated: {total_q}")
    print(f"End-to-End Latency: Mean={aggregated_latencies['end_to_end']['mean']}ms | P50={aggregated_latencies['end_to_end']['p50']}ms | P95={aggregated_latencies['end_to_end']['p95']}ms")
    print(f"Retrieval MRR: BM25={aggregated_retrieval['bm25']['mrr']} | Dense={aggregated_retrieval['dense']['mrr']} | Hybrid={aggregated_retrieval['hybrid']['mrr']} | Reranked={aggregated_retrieval['reranked']['mrr']}")
    print(f"Retrieval NDCG@5: BM25={aggregated_retrieval['bm25']['ndcg@5']} | Dense={aggregated_retrieval['dense']['ndcg@5']} | Hybrid={aggregated_retrieval['hybrid']['ndcg@5']} | Reranked={aggregated_retrieval['reranked']['ndcg@5']}")
    print(f"Retrieval Recall@5: BM25={aggregated_retrieval['bm25']['recall@5']} | Dense={aggregated_retrieval['dense']['recall@5']} | Hybrid={aggregated_retrieval['hybrid']['recall@5']} | Reranked={aggregated_retrieval['reranked']['recall@5']}")
    print(f"Agent Routing Accuracy: {routing_acc:.2%}")
    print(f"Abstention Accuracy: {abstention_acc:.2%}")
    print(f"Faithfulness Score: {avg_faithfulness:.3f}")
    print(f"Cost per 100 queries: ${cost_per_100_queries:.4f}")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_baseline_benchmark())
