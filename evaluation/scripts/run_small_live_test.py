"""Small controlled live test of TypeSafe / BeatAPI JEV (Phase 10).

Executes 5 queries from benchmark_dataset.json through the real application
with rate-limit pacing (65s cooldown per query) to respect the free-tier
quota of at most 1 request per minute per account.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import dotenv
dotenv.load_dotenv(override=True)

from backend.app.models import ChatRequest
from backend.app.service import SecureRAGService, build_request_context

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


async def main():
    dataset_path = PROJECT_ROOT / "evaluation" / "datasets" / "benchmark_dataset.json"
    with open(dataset_path, "r", encoding="utf-8") as f:
        benchmark_dataset = json.load(f)

    test_queries = benchmark_dataset[:5]
    logger.info("Loaded %d test queries for Phase 10 live test.", len(test_queries))

    service = SecureRAGService()
    results = []

    for idx, tc in enumerate(test_queries, start=1):
        q_id = tc["id"]
        query = tc["query"]
        category = tc.get("category", "")

        logger.info(
            "[%d/%d] Preparing live JEV query: %s ('%s')",
            idx, len(test_queries), q_id, query[:60]
        )

        # Wait 65s between calls to strictly respect BeatAPI's 1 req/min limit
        if idx > 1:
            logger.info("Cooling down for 65 seconds to respect free-tier rate limit...")
            await asyncio.sleep(65)

        ctx = build_request_context(client_ip="127.0.0.1", user_id=f"phase10_{q_id}")
        req = ChatRequest(query=query)

        t0 = time.perf_counter()
        resp = await service.process(req, ctx)
        dur_ms = round((time.perf_counter() - t0) * 1000, 2)

        pdata = resp.pipeline_data
        dmeta = pdata.decision_metadata if pdata else {}

        record = {
            "query_id": q_id,
            "category": category,
            "query": query,
            "e2e_latency_ms": dur_ms,
            "backend_used": dmeta.get("decision_backend"),
            "requested_backend": dmeta.get("requested_backend"),
            "jev_called": dmeta.get("jev_called"),
            "jev_success": dmeta.get("jev_success"),
            "model": dmeta.get("jev_model"),
            "jev_latency_ms": dmeta.get("latency_ms"),
            "retrieval_decision": {
                "retrieval_mode": dmeta.get("retrieval_mode"),
                "hop_mode": dmeta.get("hop_mode"),
                "query_transformation": dmeta.get("query_transformation"),
                "route_type": dmeta.get("route_type"),
            },
            "confidence": dmeta.get("confidence"),
            "probabilities": dmeta.get("probabilities"),
            "fallback_occurred": dmeta.get("fallback_occurred"),
            "fallback_reason": dmeta.get("fallback_reason"),
            "evidence_decision": {
                "status": dmeta.get("sufficiency_status"),
                "is_sufficient": dmeta.get("evidence_sufficient"),
                "confidence": dmeta.get("sufficiency_confidence"),
                "fallback": dmeta.get("sufficiency_fallback"),
                "fallback_reason": dmeta.get("sufficiency_fallback_reason"),
            },
            "answer_preview": resp.answer[:150] + "..." if resp.answer else "",
        }
        results.append(record)

        logger.info(
            "Query %s complete | Backend: %s | Jev success: %s | Route: %s | Jev Latency: %sms",
            q_id, record["backend_used"], record["jev_success"],
            record["retrieval_decision"]["retrieval_mode"], record["jev_latency_ms"]
        )

    out_dir = PROJECT_ROOT / "evaluation" / "jev"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "small_live_test_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    logger.info("Saved Phase 10 results to %s", out_file)
    print("\n================= PHASE 10 SUMMARY =================")
    for r in results:
        print(f"ID: {r['query_id']} | Backend: {r['backend_used']} | Jev Success: {r['jev_success']} | Mode: {r['retrieval_decision']['retrieval_mode']} | Conf: {r['confidence']} | Jev Lat: {r['jev_latency_ms']}ms")
    print("====================================================\n")


if __name__ == "__main__":
    asyncio.run(main())
