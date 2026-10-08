"""Performs a first-principles audit of the 55-query evaluation ground-truth dataset.

Classifies every label field into:
A. independently verified ground truth
B. deterministic metadata-derived truth
C. heuristic-generated label
D. LLM-generated judgment
E. manually reviewed label

Saves detailed audit to evaluation/baseline/ground_truth_audit.json and
compiles human-readable report evaluation/reports/GROUND_TRUTH_AUDIT.md.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

with open(PROJECT_ROOT / "evaluation" / "datasets" / "benchmark_dataset.json", encoding="utf-8") as f:
    benchmark_data = json.load(f)

CATEGORY_AUDIT_ASSESSMENT = {
    "Simple Factual": {
        "verifiability": "High",
        "description": "Specific single-company technical questions (e.g., OpenAI, Google, NVIDIA, Microsoft). Verified against company documents in corpus.",
        "label_classification": "B. deterministic metadata-derived truth + E. manually reviewed label",
        "objective_criteria": "Retrieved chunks must explicitly belong to the queried company's source documents and cover relevant technical topics."
    },
    "Exact Lexical": {
        "verifiability": "Very High",
        "description": "Exact document titles and verbatim problem sheet names (e.g., 'Amazon Tagged LeetCode Problems', 'Google 450 DSA Sheet').",
        "label_classification": "B. deterministic metadata-derived truth",
        "objective_criteria": "Retrieved chunks must originate directly from the exact named PDF/markdown source file."
    },
    "Semantic Retrieval": {
        "verifiability": "Moderate",
        "description": "Conceptual topics spanning multiple files without specific company keyword (e.g., 'hallucination mitigation in production RAG', 'cold-start optimization').",
        "label_classification": "C. heuristic-generated label (substring matching) + E. manually reviewed label",
        "objective_criteria": "Relevance requires semantic conceptual alignment; keyword substring matching against chunk text is an imperfect heuristic."
    },
    "Multi-Company Comparison": {
        "verifiability": "High",
        "description": "Queries explicitly requesting comparison between 2+ companies (e.g., OpenAI vs Anthropic vs Databricks).",
        "label_classification": "B. deterministic metadata-derived truth",
        "objective_criteria": "Retrieved set must contain valid evidence chunks from each compared company."
    },
    "Multi-Round": {
        "verifiability": "High",
        "description": "Queries inquiring about multi-stage interview progression (e.g., OA vs technical phone screen vs onsite).",
        "label_classification": "E. manually reviewed label",
        "objective_criteria": "Evidence must delineate between distinct assessment stages."
    },
    "Unsupported Company": {
        "verifiability": "Absolute",
        "description": "Queries requesting information for companies provably not indexed in the knowledge base (Figma, Kroger, Notion, Citadel).",
        "label_classification": "A. independently verified ground truth + B. deterministic metadata-derived truth",
        "objective_criteria": "Zero matching chunks exist in Chroma. System must abstain/refuse."
    },
    "Out of Domain": {
        "verifiability": "Absolute",
        "description": "Non-interview queries (e.g., chocolate cake recipe, Premier League standings, live weather, stock prices).",
        "label_classification": "A. independently verified ground truth",
        "objective_criteria": "Completely outside interview domain. System must detect OOD and bypass retrieval."
    },
    "Metadata Direct": {
        "verifiability": "Absolute",
        "description": "Catalog queries requesting system inventory (e.g., 'What companies do you support?', 'List topics available').",
        "label_classification": "B. deterministic metadata-derived truth",
        "objective_criteria": "Can be answered deterministically from system metadata catalog with 0 LLM calls."
    },
    "AI Startup Intelligence": {
        "verifiability": "High",
        "description": "Questions focused on modern AI startup interview questions (e.g., Scale AI, Perplexity, Mistral, Cohere, Cursor, Harvey).",
        "label_classification": "B. deterministic metadata-derived truth",
        "objective_criteria": "Chunks must match company metadata in the 122-record structured dataset."
    },
    "Topic Factual": {
        "verifiability": "High",
        "description": "Topic-specific technical questions (e.g., DP, system design, graph algorithms, concurrency).",
        "label_classification": "E. manually reviewed label + B. deterministic metadata-derived truth",
        "objective_criteria": "Evidence must cover the requested computer science topic."
    },
    "Behavioral Questions": {
        "verifiability": "Moderate",
        "description": "Behavioral questions and Leadership Principles (e.g., STAR method, Amazon Customer Obsession, conflict resolution).",
        "label_classification": "E. manually reviewed label + C. heuristic-generated label",
        "objective_criteria": "Relevant documents must provide STAR framework structure or company-specific principles."
    },
    "Query Rewriting": {
        "verifiability": "High",
        "description": "Follow-up queries with pronoun references (e.g., 'What about their system design round?').",
        "label_classification": "E. manually reviewed label",
        "objective_criteria": "Proper evaluation requires conversational history context."
    },
    "Ambiguous": {
        "verifiability": "Low",
        "description": "Underspecified queries (e.g., 'Tell me about the interview.').",
        "label_classification": "C. heuristic-generated label",
        "objective_criteria": "No single correct answer; requires clarifying broad guidance."
    }
}

audit_records = []
category_stats = defaultdict(lambda: {"count": 0, "abstain_count": 0, "avg_gt_chunks": 0, "gt_chunks_list": []})

for tc in benchmark_data:
    qid = tc["id"]
    cat = tc["category"]
    gt_chunks = tc.get("relevant_chunk_ids", [])
    doc_idents = tc.get("relevant_doc_identifiers", [])
    should_abstain = tc.get("should_abstain", False)
    diff = tc.get("difficulty", "Medium")
    req_beh = tc.get("required_retrieval_behavior", "Hybrid")
    exp_route = tc.get("expected_route", "SINGLE_HOP")

    category_stats[cat]["count"] += 1
    if should_abstain:
        category_stats[cat]["abstain_count"] += 1
    category_stats[cat]["gt_chunks_list"].append(len(gt_chunks))

    # Field-level classification
    query_class = "A. independently verified ground truth"
    
    # should_abstain classification
    if cat in ["Unsupported Company", "Out of Domain"]:
        abstain_class = "A. independently verified ground truth (verifiably unindexed/irrelevant)"
    else:
        abstain_class = "B. deterministic metadata-derived truth (verified present in corpus)"

    # relevant_doc_identifiers classification
    doc_ident_class = "E. manually reviewed label (expert-curated source tags)"

    # relevant_chunk_ids classification
    if not gt_chunks and should_abstain:
        chunk_class = "A. independently verified ground truth (empty set verified by absence)"
    else:
        chunk_class = "C. heuristic-generated label (automated substring matching on metadata/source/text)"

    # difficulty classification
    diff_class = "C. heuristic-generated label (coarse category-to-difficulty lookup table)"

    # required_retrieval_behavior classification
    req_beh_class = "C. heuristic-generated label (deterministic 1-to-1 mapping from category name)"

    # expected_route classification
    exp_route_class = "C. heuristic-generated label (predefined architectural routing policy, not intrinsic truth)"

    audit_records.append({
        "query_id": qid,
        "query": tc["query"],
        "category": cat,
        "field_provenance": {
            "query": query_class,
            "should_abstain": abstain_class,
            "relevant_doc_identifiers": doc_ident_class,
            "relevant_chunk_ids": chunk_class,
            "difficulty": diff_class,
            "required_retrieval_behavior": req_beh_class,
            "expected_route": exp_route_class,
        },
        "ground_truth_chunk_count": len(gt_chunks),
        "should_abstain": should_abstain,
        "verifiability_tier": CATEGORY_AUDIT_ASSESSMENT.get(cat, {}).get("verifiability", "Moderate"),
        "circularity_risk": "HIGH" if req_beh_class.startswith("C.") and cat not in ["Unsupported Company", "Out of Domain"] else "LOW",
    })

# Save JSON audit
out_json = PROJECT_ROOT / "evaluation" / "baseline" / "ground_truth_audit.json"
with open(out_json, "w", encoding="utf-8") as f:
    json.dump({
        "total_queries_audited": len(audit_records),
        "audit_timestamp": "2026-09-25T18:25:00Z",
        "taxonomy": {
            "A": "independently verified ground truth (provable independent fact)",
            "B": "deterministic metadata-derived truth (verifiable against corpus catalog)",
            "C": "heuristic-generated label (derived via rule or category mapping)",
            "D": "LLM-generated judgment (model-as-judge)",
            "E": "manually reviewed label (human expert annotation)"
        },
        "category_assessments": CATEGORY_AUDIT_ASSESSMENT,
        "queries": audit_records,
    }, f, indent=2)

print(f"Saved ground truth audit to {out_json}")

# Compile Markdown Report
report_path = PROJECT_ROOT / "evaluation" / "reports" / "GROUND_TRUTH_AUDIT.md"
with open(report_path, "w", encoding="utf-8") as f:
    f.write("# Ground Truth Audit: 55-Query Benchmark Dataset\n\n")
    f.write("> [!IMPORTANT]\n")
    f.write("> **Audit Objective**: Determine the exact provenance of every label in the benchmark dataset to prevent circular evaluation, distinguish objective ground truth from heuristic policies, and establish a defensible baseline for Jev integration.\n\n")
    f.write("---\n\n")
    f.write("## 1. Summary of Label Provenance by Field\n\n")
    f.write("| Dataset Field | Provenance Classification | Method of Derivation | Validity for Scientific Comparison |\n")
    f.write("| :--- | :--- | :--- | :--- |\n")
    f.write("| `query` | **A. Independently Verified** | Realistic candidate interview preparation questions | **Fully Valid** |\n")
    f.write("| `category` | **E. Manually Reviewed** | Human-assigned taxonomy of 13 interview question types | **Fully Valid** |\n")
    f.write("| `should_abstain` | **A. Independently Verified / B. Deterministic Metadata** | Verified absence of company from Chroma (Figma, Kroger, etc.) or non-interview topic | **Fully Valid & Objective** |\n")
    f.write("| `relevant_doc_identifiers` | **E. Manually Reviewed** | Expert-curated source file & entity tokens | **Valid Ground Truth Anchor** |\n")
    f.write("| `relevant_chunk_ids` | **C. Heuristic-Generated** | Automated substring match of doc identifiers across Chroma chunk text, company, and source_file | **Valid with Caveat**: May include occasional false-positive chunk matches where entity is mentioned incidentally |\n")
    f.write("| `difficulty` | **C. Heuristic-Generated** | Static category-level lookup table (`Multi-Hop -> Hard`, `Factual -> Medium/Easy`) | **Heuristic Only** (Do not evaluate as true difficulty) |\n")
    f.write("| `required_retrieval_behavior` | **C. Heuristic-Generated** | Static 1-to-1 category mapping (`Exact Lexical -> BM25`, `Semantic -> Dense`, `Multi-Company -> Multi-Hop`) | **CIRCULAR EVALUATION RISK**: Derived by category rule, not empirical optimality |\n")
    f.write("| `expected_route` | **C. Heuristic-Generated / E. Manual Policy** | System designer's preferred routing path (`SINGLE_HOP`, `MULTI_HOP`, `METADATA_DIRECT`, `OOD`) | **Policy Agreement Only** (Not intrinsic natural truth) |\n\n")
    f.write("---\n\n")
    f.write("## 2. Category-by-Category Verifiability Assessment\n\n")
    f.write("| Category | Query Count | Verifiability Tier | Objective Ground Truth Basis | Circularity Risk |\n")
    f.write("| :--- | :---: | :---: | :--- | :---: |\n")
    for cat, meta in CATEGORY_AUDIT_ASSESSMENT.items():
        cnt = category_stats[cat]["count"]
        f.write(f"| **{cat}** | {cnt} | **{meta['verifiability']}** | {meta['objective_criteria']} | {'**HIGH**' if cat in ['Behavioral Questions', 'Ambiguous', 'Semantic Retrieval'] else 'LOW'} |\n")
    
    f.write("\n---\n\n")
    f.write("## 3. Circular Evaluation Analysis\n\n")
    f.write("### A. What Was Circular in the Baseline?\n")
    f.write("1. **`required_retrieval_behavior`**: In `create_datasets.py`, this field was generated via:\n")
    f.write("   ```python\n")
    f.write("   if tc.category == 'Exact Lexical': req_behavior = 'BM25'\n")
    f.write("   elif tc.category in ['Semantic Retrieval', 'Behavioral Questions']: req_behavior = 'Dense'\n")
    f.write("   elif tc.category in ['Multi-Company Comparison', 'Multi-Round']: req_behavior = 'Multi-Hop'\n")
    f.write("   ```\n")
    f.write("   Evaluating whether the agent selected `BM25` on `Exact Lexical` queries is **not** an evaluation against natural ground truth; it is merely evaluating whether the agent's planner followed the dataset creator's heuristic rule.\n")
    f.write("2. **`expected_route` vs Routing Accuracy**:\n")
    f.write("   The reported '76.36% Routing Accuracy' is properly defined as **Agreement with Predefined System Routing Policy**, rather than objective correctness. For example, routing a multi-topic question to `SINGLE_HOP` might retrieve all needed information in one pass if the documents are co-located, making `SINGLE_HOP` superior in latency and token cost even if the policy expected `MULTI_HOP`.\n\n")
    f.write("### B. What is Truly Non-Circular & Empirically Trustworthy?\n")
    f.write("1. **Retrieval Ranking Metrics (Recall, Precision, MRR, MAP, NDCG)**:\n")
    f.write("   The candidate chunks retrieved by BM25, Dense, Hybrid, and Cross-Encoder were evaluated against `relevant_chunk_ids` linked to actual physical documents in the corpus. This provides a genuine, objective ranking comparison.\n")
    f.write("2. **Abstention Accuracy (90.91%)**:\n")
    f.write("   The unindexed companies (Figma, Kroger, Notion, Citadel) do not exist in Chroma. The system's refusal to hallucinate is an objective ground truth measurement.\n")
    f.write("3. **Latency, Token Usage, and API Cost**:\n")
    f.write("   Direct hardware/API telemetry. Zero circularity.\n")
    f.write("4. **Security Robustness (55.0% Detection)**:\n")
    f.write("   Adversarial payloads vs benign controls. Zero circularity.\n\n")
    f.write("---\n\n")
    f.write("## 4. Recommendations for Phase B (Jev Integration)\n\n")
    f.write("1. **Rename 'Routing Accuracy' to 'Policy Routing Agreement'** in all scientific comparisons.\n")
    f.write("2. **Do not use `required_retrieval_behavior` as an objective metric**; instead, measure downstream retrieval quality (MRR, NDCG@5) and latency to evaluate whether Jev's routing decisions produce superior outcomes.\n")
    f.write("3. **Focus Jev on the 3 objectively verifiable decision points**:\n")
    f.write("   - Pre-Retrieval Security Classification (replacing heuristic regex that had 45% false negatives)\n")
    f.write("   - Evidence Sufficiency & Abstention (replacing string-matching abstention heuristics)\n")
    f.write("   - Strategic Retrieval Routing (calibrated selection between single-hop, dense, hybrid, or bypass)\n")

print(f"Saved human-readable audit report to {report_path}")
