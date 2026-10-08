# Frozen Baseline Certificate: Agentic Placement RAG

> [!IMPORTANT]
> **IMMUTABLE BASELINE DECLARATION**:
> The BEFORE baseline was frozen prior to Jev integration.
> Under **Rule 1: The BEFORE baseline is immutable**, all baseline artifacts, raw query outputs, aggregated metrics, per-category results, ground truth audit files, and manifest checksums are permanently frozen. No changes, recalculations, or retroactive modifications are permitted in this directory.

---

## 1. Frozen Baseline Identification

- **System Name**: Agentic Placement RAG
- **Baseline Timestamp (UTC)**: `2026-09-25T18:15:00Z`
- **Git Commit SHA**: `c01961b1461f76bafb093920cb18a809a4b3ef27`
- **Python / Runtime**: Python 3.10.9 (64-bit) on Windows-10-10.0.26200-SP0
- **Vector DB / Collection**: ChromaDB (`data/chroma_db`), collection `placement_rag` (357 indexed chunks)
- **Embedding Model**: `gemini-embedding-001` (768 dimensions)
- **Neural Reranker**: `cross-encoder/ms-marco-MiniLM-L-6-v2` (top-8 reranking)
- **Generation Model**: `gemini-2.5-flash`

---

## 2. Cryptographic Checksum Registry (SHA-256)

| Artifact | File Path | Verified SHA-256 Checksum |
| :--- | :--- | :--- |
| **Benchmark Dataset** | `evaluation/datasets/benchmark_dataset.json` | `41d5a51a46dc08a81e5221a21d76531e425c0f175faeec8da7afd2e732833d8c` |
| **Security Attack Dataset** | `evaluation/datasets/security_attack_dataset.json` | `d6616f4eab4df1520663257465527c078af0551f9720172387ae59bf6989b88c` |
| **Raw Baseline Results** | `evaluation/baseline/raw_results.json` | `ec862f33b6076e6b0d4fb048ba638398a2321f86837e83e774f483df7ee478f1` |
| **Aggregated Baseline Metrics** | `evaluation/baseline/aggregated_baseline_metrics.json` | `31e1b353d85cb738b42473f833ba49303151d8bb0a64804c06c8dc311f78d45f` |
| **Retrieval Stage Comparison** | `evaluation/baseline/retrieval_stage_comparison.json` | `23f01cb9fa725da9e6087690c6a9df0c2fe16afbdf58a8ea7a73ba613c417b74` |
| **Security Evaluation Results** | `evaluation/baseline/security_evaluation_results.json` | `cbb347b0361d30562ffdd313d72b5df98aae7397250dfb73da9eba8bb823a2ad` |

---

## 3. Key Baseline Numbers (Pre-Jev)

- **Dataset Size**: $N = 55$ queries across 13 technical interview categories.
- **Reranked Retrieval Quality**:
  - MRR: `0.8576`
  - MAP: `0.7813`
  - Recall@1: `0.2223`, Recall@3: `0.2808`, Recall@5: `0.3128`, Recall@10: `0.3359`
  - Precision@1: `0.8364`, Precision@3: `0.6364`, Precision@5: `0.5782`, Precision@10: `0.4418`
  - NDCG@3: `0.7096`, NDCG@5: `0.6993`, NDCG@10: `0.6448`
- **Agent Policy Routing Agreement**: `76.36%` (42/55 queries agreed with predefined policy)
- **Abstention Accuracy**: `90.91%` (50/55 queries correctly handled regarding unsupported companies/OOD)
- **End-to-End Latency**: Mean `9063.51 ms`, Median (P50) `5380.58 ms`, P90 `27471.86 ms`, P95 `33645.53 ms`
- **Measured Generation Cost**: `$0.006498` total across 55 queries ($0.000118 / query)
- **Security Baseline**: Attack Detection `55.0%` (11/20), False Positives `0.0%` (0/10), Security Overhead `0.485 ms`

---

## 4. Methodological Note on Terminology
As documented in `evaluation/reports/GROUND_TRUTH_AUDIT.md`, the baseline metric previously termed "Routing Accuracy" (76.36%) is strictly classified as **Policy Routing Agreement**. The existing benchmark `expected_route` values represent heuristic policy preferences rather than intrinsic ground truth.
