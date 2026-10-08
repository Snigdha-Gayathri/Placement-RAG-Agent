"""Validates retrieval metrics calculation against manual math for 5 diverse test queries."""

from __future__ import annotations

import json
import math
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

with open(PROJECT_ROOT / "evaluation" / "baseline" / "raw_results.json", encoding="utf-8") as f:
    raw = json.load(f)

selected_ids = ["fact_01", "exact_01", "sem_01", "multi_comp_01", "unsupported_comp_01"]

print("=" * 80)
print("AUDIT: INDEPENDENT MANUAL VERIFICATION OF 5 BENCHMARK QUERIES")
print("=" * 80)

for q in raw:
    tc = q["test_case"]
    qid = tc["id"]
    if qid in selected_ids:
        print("-" * 80)
        print(f"QUERY ID: {qid} | CATEGORY: {tc['category']}")
        print(f"QUERY: {tc['query']}")
        gt = set(tc.get("relevant_chunk_ids", []))
        print(f"Ground Truth Relevant Chunks Count: {len(gt)}")
        
        for stage in ["bm25", "reranked"]:
            retrieved = q["retrieval_candidate_ids"][stage]
            code_metrics = q["retrieval_metrics"][stage]
            
            if not gt:
                manual = {
                    "recall@1": 1.0 if not retrieved else 0.0,
                    "recall@3": 1.0 if not retrieved else 0.0,
                    "recall@5": 1.0 if not retrieved else 0.0,
                    "recall@10": 1.0 if not retrieved else 0.0,
                    "precision@1": 1.0 if not retrieved else 0.0,
                    "precision@3": 1.0 if not retrieved else 0.0,
                    "precision@5": 1.0 if not retrieved else 0.0,
                    "hit_rate@1": 1.0 if not retrieved else 0.0,
                    "hit_rate@3": 1.0 if not retrieved else 0.0,
                    "hit_rate@5": 1.0 if not retrieved else 0.0,
                    "mrr": 1.0 if not retrieved else 0.0,
                    "map": 1.0 if not retrieved else 0.0,
                    "r_precision": 1.0 if not retrieved else 0.0,
                }
            else:
                rel = [1 if cid in gt else 0 for cid in retrieved]
                first_hit = next((i + 1 for i, r in enumerate(rel) if r == 1), 0)
                mrr = 1.0 / first_hit if first_hit > 0 else 0.0
                
                # MAP
                cum_prec = 0.0
                hits = 0
                for i, r in enumerate(rel):
                    if r == 1:
                        hits += 1
                        cum_prec += hits / (i + 1)
                map_val = (cum_prec / min(len(gt), len(rel))) if (hits > 0 and len(rel) > 0) else 0.0
                
                # R-precision
                r_flags = rel[:len(gt)]
                r_prec = sum(r_flags) / len(gt) if len(gt) > 0 else 0.0
                
                manual = {
                    "mrr": mrr,
                    "map": map_val,
                    "r_precision": r_prec,
                }
                for k in [1, 3, 5, 10]:
                    sub = rel[:k]
                    h = sum(sub)
                    manual[f"hit_rate@{k}"] = 1.0 if h > 0 else 0.0
                    manual[f"precision@{k}"] = h / k
                    manual[f"recall@{k}"] = min(1.0, h / len(gt))
                    
                    dcg = sum(r / math.log2(i + 2) for i, r in enumerate(sub))
                    idcg = sum(1.0 / math.log2(i + 2) for i in range(min(len(gt), k)))
                    manual[f"ndcg@{k}"] = (dcg / idcg) if idcg > 0 else 0.0
            
            # Compare
            mismatches = []
            for k, v in manual.items():
                cv = code_metrics.get(k)
                if cv is None or abs(cv - v) > 1e-4:
                    mismatches.append((k, v, cv))
            
            if mismatches:
                print(f"  [{stage.upper()}] MISMATCHES: {mismatches}")
            else:
                print(f"  [{stage.upper():8s}] (Pool size: {len(retrieved):2d}) -> ALL METRICS MATCH MANUAL PENCIL-AND-PAPER MATH (Diff < 1e-4)")
                print(f"               MRR={manual['mrr']:.4f} | NDCG@5={manual.get('ndcg@5', 0.0):.4f} | Recall@5={manual.get('recall@5', 0.0):.4f} | Prec@5={manual.get('precision@5', 0.0):.4f}")
print("=" * 80)
