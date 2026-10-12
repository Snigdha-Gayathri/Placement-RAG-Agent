"""Authoritative evaluation metrics for RAG retrieval and answer generation.

Fixes mathematical flaws from Phase 1 audit:
1. Bounded NDCG@k strictly in [0.0, 1.0] with proper IDCG formulation.
2. Consistent precision and recall denominators.
3. Strict deduplication of retrieved chunk IDs.
4. Total separation of answerable query retrieval metrics from unanswerable query metrics.
5. Unanswerable queries never receive synthetic perfect (1.0) ranking scores.
"""

from __future__ import annotations

import math
import re
from typing import Any


def deduplicate_chunk_ids(chunk_ids: list[str]) -> list[str]:
    """Deduplicate chunk IDs while preserving rank order."""
    seen: set[str] = set()
    unique: list[str] = []
    for cid in chunk_ids:
        if cid and cid not in seen:
            seen.add(cid)
            unique.append(cid)
    return unique


def compute_dcg(relevance_flags: list[int], k: int) -> float:
    """Compute Discounted Cumulative Gain at cutoff k.
    
    DCG@k = sum_{i=0}^{k-1} (rel_i / log2(i + 2))
    """
    return sum(r / math.log2(i + 2) for i, r in enumerate(relevance_flags[:k]))


def compute_idcg(num_relevant: int, k: int) -> float:
    """Compute Ideal Discounted Cumulative Gain for binary relevance at cutoff k.
    
    IDCG@k = sum_{i=0}^{min(num_relevant, k) - 1} (1.0 / log2(i + 2))
    """
    return sum(1.0 / math.log2(i + 2) for i in range(min(num_relevant, k)))


def compute_ranking_metrics(
    retrieved_chunk_ids: list[str],
    ground_truth_chunk_ids: list[str],
    k_values: tuple[int, ...] = (1, 3, 5, 10),
) -> dict[str, float | None]:
    """Calculate Recall@K, Precision@K, HitRate@K, MRR, MAP@K, and NDCG@K for an answerable query.
    
    Ground-truth and retrieved items refer strictly to chunk IDs.
    Returns None for ranking metrics if ground_truth_chunk_ids is empty (unanswerable query).
    """
    gt_set = set(cid for cid in ground_truth_chunk_ids if cid)
    total_gt = len(gt_set)

    # For unanswerable queries (0 relevant chunks in corpus), ranking metrics are undefined / not applicable
    if total_gt == 0:
        return {
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
            "mrr": None,
            "map@5": None,
            "map@10": None,
            "total_relevant_ground_truth": 0,
            "retrieved_unique_count": len(deduplicate_chunk_ids(retrieved_chunk_ids)),
        }

    unique_retrieved = deduplicate_chunk_ids(retrieved_chunk_ids)
    rel_flags = [1 if cid in gt_set else 0 for cid in unique_retrieved]

    metrics: dict[str, float | None] = {
        "total_relevant_ground_truth": total_gt,
        "retrieved_unique_count": len(unique_retrieved),
    }

    # HitRate@K, Precision@K, Recall@K, NDCG@K
    for k in k_values:
        top_k_rel = rel_flags[:k]
        hits = sum(top_k_rel)

        # HitRate@K: Binary indicator if at least one relevant item in top-k
        metrics[f"hit_rate@{k}"] = 1.0 if hits > 0 else 0.0

        # Precision@K: hits / k (denominator is fixed k)
        metrics[f"precision@{k}"] = round(hits / k, 4)

        # Recall@K: hits / total_gt (capped at 1.0 since items are deduplicated)
        metrics[f"recall@{k}"] = round(min(1.0, hits / total_gt), 4)

        # NDCG@K: DCG@k / IDCG@k
        dcg = compute_dcg(top_k_rel, k)
        idcg = compute_idcg(total_gt, k)
        if idcg > 0.0:
            ndcg = dcg / idcg
            # Numerical tolerance clamp
            if ndcg > 1.0 and ndcg < 1.00001:
                ndcg = 1.0
            if not (0.0 <= ndcg <= 1.0):
                raise ValueError(
                    f"NDCG@{k} calculation violation: score {ndcg} is outside [0.0, 1.0]. "
                    f"dcg={dcg}, idcg={idcg}, hits={hits}, total_gt={total_gt}"
                )
            metrics[f"ndcg@{k}"] = round(ndcg, 4)
        else:
            metrics[f"ndcg@{k}"] = 0.0

    # MRR: Reciprocal rank of first genuinely relevant result
    first_hit_rank = next((i + 1 for i, r in enumerate(rel_flags) if r == 1), 0)
    metrics["mrr"] = round(1.0 / first_hit_rank, 4) if first_hit_rank > 0 else 0.0

    # MAP@5 & MAP@10
    for map_k in (5, 10):
        cum_prec = 0.0
        hits = 0
        for i, r in enumerate(rel_flags[:map_k]):
            if r == 1:
                hits += 1
                cum_prec += hits / (i + 1)
        denom = min(total_gt, map_k)
        metrics[f"map@{map_k}"] = round(cum_prec / denom, 4) if denom > 0 else 0.0

    return metrics


def check_abstention(answer: str, should_abstain: bool) -> dict[str, Any]:
    """Check if the answer correctly abstained when evidence was insufficient.
    
    Distinguishes:
    - Appropriate abstention (unanswerable question correctly refused)
    - Inappropriate abstention (answerable question refused unnecessarily)
    - False answer (unanswerable question hallucinated/attempted without evidence)
    - Grounded answer (answerable question answered)
    """
    ans_lower = answer.lower().strip()
    words = len(answer.split())

    abstained = False
    # 1. Structural evidence sufficiency notice
    if "evidence sufficiency notice" in ans_lower:
        abstained = True
    # 2. Direct scope / domain refusals
    elif any(
        ans_lower.startswith(p)
        for p in [
            "i am unable to answer",
            "i cannot answer",
            "unable to answer",
            "cannot answer",
            "the query is outside the scope",
            "this query is outside the scope",
            "i am an evidence-grounded interview preparation assistant",
            "i am an evidence-grounded company technical interview preparation assistant",
            "outside the scope of technical interview intelligence",
        ]
    ):
        abstained = True
    # 3. Explicit lack of verified records in opening statement (refusal opening)
    elif any(
        ans_lower.startswith(p)
        for p in [
            "the indexed records do not contain",
            "the provided indexed records do not contain",
            "the indexed interview knowledge corpus does not contain",
            "the indexed corpus does not contain",
            "the indexed records do not establish",
            "the provided records do not establish",
            "the indexed records do not have",
            "does not contain verified records",
            "no verified records",
            "no verified interview records",
            "insufficient evidence to answer",
            "not indexed in the knowledge base",
        ]
    ) and words < 200:
        abstained = True
    # 4. Concise answers (< 160 words) containing standard refusal phrases
    elif words < 160 and any(
        s in ans_lower
        for s in [
            "insufficient evidence",
            "does not contain information",
            "do not contain information",
            "cannot answer",
            "unable to answer",
            "cannot provide",
            "not indexed in the knowledge base",
        ]
    ):
        abstained = True
    else:
        abstained = False

    correct = (abstained == should_abstain)

    status = "CORRECT_ANSWER"
    if should_abstain and abstained:
        status = "CORRECT_ABSTENTION"
    elif should_abstain and not abstained:
        status = "FALSE_ANSWER"
    elif not should_abstain and abstained:
        status = "INAPPROPRIATE_ABSTENTION"

    return {
        "abstained": abstained,
        "should_abstain": should_abstain,
        "correct": correct,
        "status": status,
    }


def aggregate_metrics(query_records: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate per-query evaluation records with clean separation of answerable vs unanswerable queries."""
    total_count = len(query_records)
    ans_records = [r for r in query_records if not r.get("should_abstain", False)]
    unans_records = [r for r in query_records if r.get("should_abstain", False)]

    def mean_of(recs: list[dict], getter) -> float:
        vals = [getter(r) for r in recs if getter(r) is not None]
        return round(sum(vals) / len(vals), 4) if vals else 0.0

    # 1. Answerable Retrieval Metrics (Denominator: N_answerable only)
    answerable_metrics = {
        "count": len(ans_records),
        "mrr": mean_of(ans_records, lambda r: r["metrics"].get("mrr")),
        "hit_rate@1": mean_of(ans_records, lambda r: r["metrics"].get("hit_rate@1")),
        "hit_rate@3": mean_of(ans_records, lambda r: r["metrics"].get("hit_rate@3")),
        "hit_rate@5": mean_of(ans_records, lambda r: r["metrics"].get("hit_rate@5")),
        "hit_rate@10": mean_of(ans_records, lambda r: r["metrics"].get("hit_rate@10")),
        "recall@1": mean_of(ans_records, lambda r: r["metrics"].get("recall@1")),
        "recall@3": mean_of(ans_records, lambda r: r["metrics"].get("recall@3")),
        "recall@5": mean_of(ans_records, lambda r: r["metrics"].get("recall@5")),
        "recall@10": mean_of(ans_records, lambda r: r["metrics"].get("recall@10")),
        "precision@1": mean_of(ans_records, lambda r: r["metrics"].get("precision@1")),
        "precision@3": mean_of(ans_records, lambda r: r["metrics"].get("precision@3")),
        "precision@5": mean_of(ans_records, lambda r: r["metrics"].get("precision@5")),
        "precision@10": mean_of(ans_records, lambda r: r["metrics"].get("precision@10")),
        "ndcg@1": mean_of(ans_records, lambda r: r["metrics"].get("ndcg@1")),
        "ndcg@3": mean_of(ans_records, lambda r: r["metrics"].get("ndcg@3")),
        "ndcg@5": mean_of(ans_records, lambda r: r["metrics"].get("ndcg@5")),
        "ndcg@10": mean_of(ans_records, lambda r: r["metrics"].get("ndcg@10")),
        "map@5": mean_of(ans_records, lambda r: r["metrics"].get("map@5")),
        "map@10": mean_of(ans_records, lambda r: r["metrics"].get("map@10")),
    }

    # 2. Abstention Metrics (Denominator: N_unanswerable for abstention accuracy; N_answerable for inappropriate abstention)
    correct_abstentions = sum(1 for r in unans_records if r["abstention"]["status"] == "CORRECT_ABSTENTION")
    false_answers = sum(1 for r in unans_records if r["abstention"]["status"] == "FALSE_ANSWER")
    inappropriate_abstentions = sum(1 for r in ans_records if r["abstention"]["status"] == "INAPPROPRIATE_ABSTENTION")

    abstention_summary = {
        "unanswerable_total": len(unans_records),
        "correct_abstention_count": correct_abstentions,
        "false_answer_count": false_answers,
        "abstention_accuracy": round(correct_abstentions / len(unans_records), 4) if unans_records else 1.0,
        "false_answer_rate": round(false_answers / len(unans_records), 4) if unans_records else 0.0,
        "answerable_total": len(ans_records),
        "inappropriate_abstention_count": inappropriate_abstentions,
        "inappropriate_abstention_rate": round(inappropriate_abstentions / len(ans_records), 4) if ans_records else 0.0,
        "avg_distractor_chunks_on_unanswerable": mean_of(unans_records, lambda r: r.get("retrieved_chunk_count", 0)),
    }

    # 3. Generation / RAGAS Quality Metrics
    faith_records = [r for r in query_records if r.get("ragas_metrics", {}).get("faithfulness") is not None]
    rel_records = [r for r in query_records if r.get("ragas_metrics", {}).get("answer_relevancy") is not None]

    ragas_summary = {
        "faithfulness": mean_of(faith_records, lambda r: r["ragas_metrics"]["faithfulness"]),
        "answer_relevancy": mean_of(rel_records, lambda r: r["ragas_metrics"]["answer_relevancy"]),
        "faithfulness_evaluated_count": len(faith_records),
        "relevancy_evaluated_count": len(rel_records),
    }

    # 4. Latency
    latency_summary = {
        "mean_ms": mean_of(query_records, lambda r: r.get("latency_ms")),
    }

    return {
        "total_queries": total_count,
        "answerable_queries_count": len(ans_records),
        "unanswerable_queries_count": len(unans_records),
        "retrieval_metrics": answerable_metrics,
        "abstention_metrics": abstention_summary,
        "ragas_metrics": ragas_summary,
        "latency_metrics": latency_summary,
    }
