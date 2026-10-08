"""Executes the 6 ablation study configurations across the benchmark dataset.

Measures real impact of each pipeline component:
1. Dense Only
2. BM25 Only
3. Hybrid RRF
4. Hybrid + Reranker
5. Hybrid + Reranker + Agent Planning
6. Full Agentic Multi-Hop

Saves comparative metrics to evaluation/baseline/ablation_results.json.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.service import SecureRAGService
from backend.evaluation.ablation_runner import AblationRunner

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


async def run_ablation():
    logger.info("Initializing SecureRAGService for ablation study...")
    svc = SecureRAGService()
    runner = AblationRunner(svc)

    logger.info("Starting 6-configuration ablation study (sample_size=20 queries)...")
    start_t = time.time()
    results = await runner.run_ablation_study(sample_size=20)
    dur_sec = round(time.time() - start_t, 2)

    logger.info("Ablation study completed in %.2fs.", dur_sec)

    out_file = PROJECT_ROOT / "evaluation" / "baseline" / "ablation_results.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "duration_seconds": dur_sec,
                "sample_size": 20,
                "configurations": results,
            },
            f,
            indent=2,
        )

    logger.info("Saved ablation results to %s", out_file)
    print("\n" + "=" * 80)
    print("ABLATION STUDY SUMMARY RESULTS (20 QUERIES)")
    print("=" * 80)
    print(f"{'Config Name':<28} | {'MRR':<6} | {'NDCG@5':<6} | {'Recall@5':<8} | {'HitRate':<7} | {'Avg Latency':<11} | {'Bypass%':<8}")
    print("-" * 80)
    for c in results:
        print(f"{c['config_name']:<28} | {c['mrr']:<6.3f} | {c['ndcg_at_k']:<6.3f} | {c['recall_at_k']:<8.3f} | {c['hit_rate']:<7.3f} | {c['avg_latency_ms']:<9.1f}ms | {c['llm_bypass_rate_pct']:<7.1f}%")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_ablation())
