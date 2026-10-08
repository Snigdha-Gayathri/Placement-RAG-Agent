"""Rigorous security gateway evaluation script for Agentic Placement RAG.

Evaluates the pre-retrieval security gateway across 20 documented adversarial attacks
and 10 benign control queries to measure real detection, blocking, false positive,
and false negative rates along with security latency overhead.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from security import InputValidator, PromptInjectionDetector, SecurityLogger, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run_security_benchmark():
    dataset_path = PROJECT_ROOT / "evaluation" / "datasets" / "security_attack_dataset.json"
    if not dataset_path.exists():
        logger.error("Security dataset not found at %s. Run create_datasets.py first.", dataset_path)
        return

    with open(dataset_path, "r", encoding="utf-8") as f:
        security_dataset = json.load(f)

    logger.info("Loaded %d security test cases.", len(security_dataset))

    config = load_config()
    input_validator = InputValidator(config)
    injection_detector = PromptInjectionDetector(config)

    raw_security_results = []
    category_counts = defaultdict(lambda: {"total": 0, "blocked": 0, "allowed": 0})
    latencies = {"input_validation_ms": [], "injection_detection_ms": [], "total_security_ms": []}

    tp = 0  # True Positives: Attack correctly detected and blocked
    fn = 0  # False Negatives: Attack missed and allowed
    tn = 0  # True Negatives: Benign query correctly allowed
    fp = 0  # False Positives: Benign query incorrectly blocked

    for idx, sc in enumerate(security_dataset, start=1):
        q_id = sc["id"]
        query = sc["query"]
        category = sc["category"]
        is_attack = sc["is_attack"]
        expected_action = sc["expected_action"]

        # Step 1: Input Validation
        t0_val = time.perf_counter()
        validation = input_validator.validate(query)
        dur_val_ms = round((time.perf_counter() - t0_val) * 1000, 3)

        # Step 2: Prompt Injection Detection
        t0_inj = time.perf_counter()
        injection = injection_detector.detect(validation.normalized_query)
        dur_inj_ms = round((time.perf_counter() - t0_inj) * 1000, 3)

        total_sec_ms = round(dur_val_ms + dur_inj_ms, 3)
        latencies["input_validation_ms"].append(dur_val_ms)
        latencies["injection_detection_ms"].append(dur_inj_ms)
        latencies["total_security_ms"].append(total_sec_ms)

        # Determine overall security decision
        was_blocked = (not validation.is_valid) or (injection.action == "block")
        actual_action = "block" if was_blocked else "allow"

        # Tally classification
        if is_attack:
            if was_blocked:
                tp += 1
            else:
                fn += 1
        else:
            if not was_blocked:
                tn += 1
            else:
                fp += 1

        category_counts[category]["total"] += 1
        if was_blocked:
            category_counts[category]["blocked"] += 1
        else:
            category_counts[category]["allowed"] += 1

        result_entry = {
            "id": q_id,
            "query": query,
            "category": category,
            "is_attack": is_attack,
            "expected_action": expected_action,
            "actual_action": actual_action,
            "was_correct": (actual_action == expected_action),
            "input_valid": validation.is_valid,
            "validation_reasons": validation.reasons,
            "injection_action": injection.action,
            "injection_risk_score": injection.risk_score,
            "injection_reasons": injection.reasons,
            "latency": {
                "input_validation_ms": dur_val_ms,
                "injection_detection_ms": dur_inj_ms,
                "total_security_ms": total_sec_ms,
            },
        }
        raw_security_results.append(result_entry)
        status_tag = "PASS" if actual_action == expected_action else "FAIL"
        logger.info("[%d/%d] [%s] %s (%s): %s -> %s", idx, len(security_dataset), status_tag, q_id, category, expected_action, actual_action)

    total_attacks = tp + fn
    total_benign = tn + fp
    attack_detection_rate = tp / max(1, total_attacks)
    attack_blocking_rate = tp / max(1, total_attacks)
    false_positive_rate = fp / max(1, total_benign)
    false_negative_rate = fn / max(1, total_attacks)
    overall_accuracy = (tp + tn) / len(security_dataset)

    def stats(vals: list[float]) -> dict[str, float]:
        s = sorted(vals)
        n = len(s)
        return {
            "mean_ms": round(sum(s) / n, 3),
            "p50_ms": round(s[int(n * 0.50)], 3),
            "p95_ms": round(s[min(n - 1, int(n * 0.95))], 3),
            "min_ms": round(s[0], 3),
            "max_ms": round(s[-1], 3),
        }

    aggregated_report = {
        "metadata": {
            "total_test_cases": len(security_dataset),
            "attacks_tested": total_attacks,
            "benign_controls_tested": total_benign,
            "threshold_configured": config.prompt_injection_threshold,
        },
        "metrics": {
            "true_positives": tp,
            "false_negatives": fn,
            "true_negatives": tn,
            "false_positives": fp,
            "attack_detection_rate": round(attack_detection_rate, 4),
            "attack_blocking_rate": round(attack_blocking_rate, 4),
            "false_positive_rate": round(false_positive_rate, 4),
            "false_negative_rate": round(false_negative_rate, 4),
            "overall_accuracy": round(overall_accuracy, 4),
        },
        "latency_overhead": {
            "input_validation": stats(latencies["input_validation_ms"]),
            "injection_detection": stats(latencies["injection_detection_ms"]),
            "total_security_overhead": stats(latencies["total_security_ms"]),
        },
        "per_category_breakdown": dict(category_counts),
        "raw_results": raw_security_results,
    }

    out_file = PROJECT_ROOT / "evaluation" / "baseline" / "security_evaluation_results.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(aggregated_report, f, indent=2)

    logger.info("Saved security evaluation report to %s", out_file)
    print("\n" + "=" * 80)
    print("SECURITY GATEWAY EVALUATION SUMMARY")
    print("=" * 80)
    print(f"Total Test Cases: {len(security_dataset)} (Attacks: {total_attacks}, Benign: {total_benign})")
    print(f"Attack Detection Rate: {attack_detection_rate:.2%} ({tp}/{total_attacks} blocked)")
    print(f"Attack Blocking Rate:  {attack_blocking_rate:.2%}")
    print(f"False Positive Rate:   {false_positive_rate:.2%} ({fp}/{total_benign} benign blocked)")
    print(f"False Negative Rate:   {false_negative_rate:.2%} ({fn}/{total_attacks} attacks missed)")
    print(f"Overall Accuracy:      {overall_accuracy:.2%}")
    print(f"Security Latency: Mean={aggregated_report['latency_overhead']['total_security_overhead']['mean_ms']}ms | P95={aggregated_report['latency_overhead']['total_security_overhead']['p95_ms']}ms")
    print("=" * 80)


if __name__ == "__main__":
    run_security_benchmark()
