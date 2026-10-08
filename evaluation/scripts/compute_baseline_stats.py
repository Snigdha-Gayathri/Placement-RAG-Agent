import json
import numpy as np
from pathlib import Path

baseline_path = Path("evaluation/jev_20/baseline_results.jsonl")
records = [json.loads(line) for line in open(baseline_path, encoding="utf-8") if line.strip()]

def get_stats(vals):
    arr = np.array(vals, dtype=float)
    return {
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0,
        "median": float(np.median(arr)),
        "p75": float(np.percentile(arr, 75)),
        "p90": float(np.percentile(arr, 90)),
        "p95": float(np.percentile(arr, 95)),
        "p99": float(np.percentile(arr, 99)),
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
    }

print("=== BASELINE SUMMARY (N=20 ALL QUERIES) ===")
metrics_list = [
    ("MRR", [r["retrieval_metrics"]["mrr"] for r in records]),
    ("Recall@1", [r["retrieval_metrics"]["recall@1"] for r in records]),
    ("Recall@3", [r["retrieval_metrics"]["recall@3"] for r in records]),
    ("Recall@5", [r["retrieval_metrics"]["recall@5"] for r in records]),
    ("Recall@10", [r["retrieval_metrics"]["recall@10"] for r in records]),
    ("Precision@1", [r["retrieval_metrics"]["precision@1"] for r in records]),
    ("Precision@3", [r["retrieval_metrics"]["precision@3"] for r in records]),
    ("Precision@5", [r["retrieval_metrics"]["precision@5"] for r in records]),
    ("Precision@10", [r["retrieval_metrics"]["precision@10"] for r in records]),
    ("NDCG@3", [r["retrieval_metrics"]["ndcg@3"] for r in records]),
    ("NDCG@5", [r["retrieval_metrics"]["ndcg@5"] for r in records]),
    ("NDCG@10", [r["retrieval_metrics"]["ndcg@10"] for r in records]),
    ("MAP@5", [r["retrieval_metrics"]["map@5"] for r in records]),
    ("MAP@10", [r["retrieval_metrics"]["map@10"] for r in records]),
    ("HitRate@1", [r["retrieval_metrics"]["hit_rate@1"] for r in records]),
    ("HitRate@3", [r["retrieval_metrics"]["hit_rate@3"] for r in records]),
    ("HitRate@5", [r["retrieval_metrics"]["hit_rate@5"] for r in records]),
    ("HitRate@10", [r["retrieval_metrics"]["hit_rate@10"] for r in records]),
    ("Context Precision", [r["retrieval_metrics"]["context_precision"] for r in records]),
    ("Context Recall", [r["retrieval_metrics"]["context_recall"] for r in records]),
    ("Faithfulness", [r["generation_metrics"]["faithfulness"] for r in records]),
    ("Answer Relevancy", [r["generation_metrics"]["answer_relevancy"] for r in records]),
    ("Factual Correctness", [r["generation_metrics"]["factual_correctness"] for r in records]),
    ("Latency E2E (ms)", [r["e2e_latency_ms"] for r in records]),
]

for name, vals in metrics_list:
    st = get_stats(vals)
    print(f"{name:<20}: Mean={st['mean']:.4f} | Median={st['median']:.4f} | Std={st['std']:.4f}")

# N=19 (excluding Q18)
rec19 = [r for r in records if r["query_id"] != "Q18"]
print("\n=== BASELINE SUMMARY (N=19 EXCLUDING Q18) ===")
for name, vals in [
    ("MRR", [r["retrieval_metrics"]["mrr"] for r in rec19]),
    ("Recall@5", [r["retrieval_metrics"]["recall@5"] for r in rec19]),
    ("Precision@5", [r["retrieval_metrics"]["precision@5"] for r in rec19]),
    ("NDCG@5", [r["retrieval_metrics"]["ndcg@5"] for r in rec19]),
    ("MAP@5", [r["retrieval_metrics"]["map@5"] for r in rec19]),
    ("Faithfulness", [r["generation_metrics"]["faithfulness"] for r in rec19]),
    ("Answer Relevancy", [r["generation_metrics"]["answer_relevancy"] for r in rec19]),
    ("Factual Correctness", [r["generation_metrics"]["factual_correctness"] for r in rec19]),
]:
    st = get_stats(vals)
    print(f"{name:<20}: Mean={st['mean']:.4f} | Median={st['median']:.4f} | Std={st['std']:.4f}")

# Latency percentiles
lat_st = get_stats([r["e2e_latency_ms"] for r in records])
print("\n=== BASELINE LATENCY PERCENTILES (ms) ===")
for k, v in lat_st.items():
    print(f"{k:<8}: {v:.2f}")

# Route & Strategy distributions
from collections import Counter
routes = Counter([r["route_type"] for r in records])
ret_modes = Counter([r["retrieval_mode"] for r in records])
hop_modes = Counter([r["hop_mode"] for r in records])
print("\n=== BASELINE ROUTING DISTRIBUTIONS ===")
print("Routes     :", dict(routes))
print("Ret Modes  :", dict(ret_modes))
print("Hop Modes  :", dict(hop_modes))
