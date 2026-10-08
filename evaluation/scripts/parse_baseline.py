import json
from pathlib import Path

baseline_path = Path("evaluation/jev_20/baseline_results.jsonl")
lines = [json.loads(line) for line in open(baseline_path, encoding="utf-8") if line.strip()]

print(f"Loaded {len(lines)} baseline records.\n")
print(f"{'QID':<5} | {'Category':<18} | {'Route':<15} | {'RetMode':<8} | {'HopMode':<10} | {'MRR':<6} | {'R@1':<6} | {'R@5':<6} | {'P@5':<6} | {'NDCG@5':<7} | {'MAP@5':<6} | {'Faith':<6} | {'Relev':<6} | {'Latency':<8}")
print("-" * 135)

for r in lines:
    qid = r["query_id"]
    cat = r["category"]
    route = r["route_type"]
    ret_mode = r["retrieval_mode"]
    hop_mode = r["hop_mode"]
    rm = r["retrieval_metrics"]
    gm = r["generation_metrics"]
    lat = r["e2e_latency_ms"]
    print(f"{qid:<5} | {cat:<18} | {route:<15} | {ret_mode:<8} | {hop_mode:<10} | {rm['mrr']:<6.3f} | {rm['recall@1']:<6.3f} | {rm['recall@5']:<6.3f} | {rm['precision@5']:<6.3f} | {rm['ndcg@5']:<7.3f} | {rm['map@5']:<6.3f} | {gm['faithfulness']:<6.3f} | {gm['answer_relevancy']:<6.3f} | {lat:<8.1f}")
