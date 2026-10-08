import csv
import json
from pathlib import Path

dataset_path = Path("evaluation/jev_20/benchmark_dataset.json")
baseline_path = Path("evaluation/jev_20/baseline_results.jsonl")

with open(dataset_path, "r", encoding="utf-8") as f:
    dataset = json.load(f)

baseline_records = [json.loads(line) for line in open(baseline_path, encoding="utf-8") if line.strip()]
b_map = {r["query_id"]: r for r in baseline_records}

# Live tested JEV queries: Q01, Q03, Q18
# For queries where live JEV full run is pending, report accurately as "NOT AVAILABLE (Pending Live Run)"
live_jev_spot_checks = {
    "Q01": {
        "status": "LIVE JEV (Spot Check Verified)",
        "retrieval_mode": "hybrid",
        "hop_mode": "multi_hop",
        "transformation": "rewrite",
        "confidence": 0.38,
        "fallback": False,
        "fallback_reason": "None",
    },
    "Q03": {
        "status": "LIVE JEV (Spot Check Verified)",
        "retrieval_mode": "hybrid",
        "hop_mode": "single_hop",
        "transformation": "none",
        "confidence": 0.99,
        "fallback": False,
        "fallback_reason": "None",
    },
    "Q18": {
        "status": "LIVE JEV (Spot Check Verified)",
        "retrieval_mode": "dense",
        "hop_mode": "single_hop",
        "transformation": "none",
        "confidence": 0.63,
        "fallback": False,
        "fallback_reason": "None",
    },
}

rows = []
json_master = []

for tc in dataset:
    qid = tc["id"]
    query = tc["query"]
    cat = tc.get("category", "")
    should_abstain = tc.get("should_abstain", False)
    suff_gt = "INSUFFICIENT" if should_abstain else "SUFFICIENT"

    b = b_map.get(qid, {})
    b_rm = b.get("retrieval_metrics", {})
    b_gm = b.get("generation_metrics", {})
    b_lat = b.get("e2e_latency_ms", 0.0)

    spot = live_jev_spot_checks.get(qid)
    if spot:
        jev_backend = "jev-1.13-free"
        jev_status = spot["status"]
        jev_ret_mode = spot["retrieval_mode"]
        jev_hop_mode = spot["hop_mode"]
        jev_trans = spot["transformation"]
        jev_conf = str(spot["confidence"])
        jev_fb_reason = spot["fallback_reason"]
    else:
        jev_backend = "jev-1.13-free"
        jev_status = "PENDING_RUN (20-query rate-paced execution required)"
        jev_ret_mode = "NOT AVAILABLE"
        jev_hop_mode = "NOT AVAILABLE"
        jev_trans = "NOT AVAILABLE"
        jev_conf = "NOT AVAILABLE"
        jev_fb_reason = "NOT AVAILABLE"

    # For metrics where JEV has not completed full 20-query run:
    jev_mrr = "NOT AVAILABLE"
    mrr_delta = "NOT AVAILABLE"
    jev_r5 = "NOT AVAILABLE"
    r5_delta = "NOT AVAILABLE"
    jev_ndcg5 = "NOT AVAILABLE"
    ndcg5_delta = "NOT AVAILABLE"
    jev_p5 = "NOT AVAILABLE"
    p5_delta = "NOT AVAILABLE"
    jev_faith = "NOT AVAILABLE"
    faith_delta = "NOT AVAILABLE"
    jev_relev = "NOT AVAILABLE"
    relev_delta = "NOT AVAILABLE"
    jev_fact = "NOT AVAILABLE"
    fact_delta = "NOT AVAILABLE"
    jev_lat = "NOT AVAILABLE"
    lat_delta = "NOT AVAILABLE"
    abstention_outcome = "CORRECT_ABSTENTION" if (should_abstain and b_gm.get("abstention_accuracy") == 1.0) else ("NORMAL_ANSWER" if not should_abstain else "FAILED_ABSTENTION")

    row = {
        "QID": qid,
        "Category": cat,
        "Exact Query": query,
        "Sufficiency Ground Truth": suff_gt,
        "Baseline Backend": "heuristic",
        "JEV Backend": jev_backend,
        "JEV Live/Fallback Status": jev_status,
        "Baseline Retrieval Mode": b.get("retrieval_mode", "hybrid"),
        "JEV Retrieval Mode": jev_ret_mode,
        "Baseline Hop Mode": b.get("hop_mode", "single_hop"),
        "JEV Hop Mode": jev_hop_mode,
        "Baseline Transformation": b.get("query_transformation", "none"),
        "JEV Transformation": jev_trans,
        "Baseline MRR": f"{b_rm.get('mrr', 0.0):.4f}",
        "JEV MRR": jev_mrr,
        "MRR Delta": mrr_delta,
        "Baseline Recall@5": f"{b_rm.get('recall@5', 0.0):.4f}",
        "JEV Recall@5": jev_r5,
        "Recall@5 Delta": r5_delta,
        "Baseline NDCG@5": f"{b_rm.get('ndcg@5', 0.0):.4f}",
        "JEV NDCG@5": jev_ndcg5,
        "NDCG@5 Delta": ndcg5_delta,
        "Baseline Precision@5": f"{b_rm.get('precision@5', 0.0):.4f}",
        "JEV Precision@5": jev_p5,
        "Precision@5 Delta": p5_delta,
        "Baseline Faithfulness": f"{b_gm.get('faithfulness', 0.0):.4f}",
        "JEV Faithfulness": jev_faith,
        "Faithfulness Delta": faith_delta,
        "Baseline Answer Relevancy": f"{b_gm.get('answer_relevancy', 0.0):.4f}",
        "JEV Answer Relevancy": jev_relev,
        "Answer Relevancy Delta": relev_delta,
        "Baseline Factual Correctness": f"{b_gm.get('factual_correctness', 0.0):.4f}",
        "JEV Factual Correctness": jev_fact,
        "Factual Correctness Delta": fact_delta,
        "Baseline Latency (ms)": f"{b_lat:.2f}",
        "JEV Latency (ms)": jev_lat,
        "Latency Delta": lat_delta,
        "JEV Confidence": jev_conf,
        "Fallback Reason": jev_fb_reason,
        "Abstention Outcome": abstention_outcome,
    }
    rows.append(row)
    json_master.append(row)

# Write CSV
csv_path = Path("evaluation/jev_20/linkedin_evidence_master.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

# Write JSON
json_path = Path("evaluation/jev_20/linkedin_evidence_master.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(json_master, f, indent=2)

print(f"Successfully generated {csv_path} and {json_path} (20 rows).")
