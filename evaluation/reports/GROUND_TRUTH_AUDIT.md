# Ground Truth Audit: 55-Query Benchmark Dataset

> [!IMPORTANT]
> **Audit Objective**: Determine the exact provenance of every label in the benchmark dataset to prevent circular evaluation, distinguish objective ground truth from heuristic policies, and establish a defensible baseline for Jev integration.

---

## 1. Summary of Label Provenance by Field

| Dataset Field | Provenance Classification | Method of Derivation | Validity for Scientific Comparison |
| :--- | :--- | :--- | :--- |
| `query` | **A. Independently Verified** | Realistic candidate interview preparation questions | **Fully Valid** |
| `category` | **E. Manually Reviewed** | Human-assigned taxonomy of 13 interview question types | **Fully Valid** |
| `should_abstain` | **A. Independently Verified / B. Deterministic Metadata** | Verified absence of company from Chroma (Figma, Kroger, etc.) or non-interview topic | **Fully Valid & Objective** |
| `relevant_doc_identifiers` | **E. Manually Reviewed** | Expert-curated source file & entity tokens | **Valid Ground Truth Anchor** |
| `relevant_chunk_ids` | **C. Heuristic-Generated** | Automated substring match of doc identifiers across Chroma chunk text, company, and source_file | **Valid with Caveat**: May include occasional false-positive chunk matches where entity is mentioned incidentally |
| `difficulty` | **C. Heuristic-Generated** | Static category-level lookup table (`Multi-Hop -> Hard`, `Factual -> Medium/Easy`) | **Heuristic Only** (Do not evaluate as true difficulty) |
| `required_retrieval_behavior` | **C. Heuristic-Generated** | Static 1-to-1 category mapping (`Exact Lexical -> BM25`, `Semantic -> Dense`, `Multi-Company -> Multi-Hop`) | **CIRCULAR EVALUATION RISK**: Derived by category rule, not empirical optimality |
| `expected_route` | **C. Heuristic-Generated / E. Manual Policy** | System designer's preferred routing path (`SINGLE_HOP`, `MULTI_HOP`, `METADATA_DIRECT`, `OOD`) | **Policy Agreement Only** (Not intrinsic natural truth) |

---

## 2. Category-by-Category Verifiability Assessment

| Category | Query Count | Verifiability Tier | Objective Ground Truth Basis | Circularity Risk |
| :--- | :---: | :---: | :--- | :---: |
| **Simple Factual** | 8 | **High** | Retrieved chunks must explicitly belong to the queried company's source documents and cover relevant technical topics. | LOW |
| **Exact Lexical** | 5 | **Very High** | Retrieved chunks must originate directly from the exact named PDF/markdown source file. | LOW |
| **Semantic Retrieval** | 3 | **Moderate** | Relevance requires semantic conceptual alignment; keyword substring matching against chunk text is an imperfect heuristic. | **HIGH** |
| **Multi-Company Comparison** | 4 | **High** | Retrieved set must contain valid evidence chunks from each compared company. | LOW |
| **Multi-Round** | 3 | **High** | Evidence must delineate between distinct assessment stages. | LOW |
| **Unsupported Company** | 4 | **Absolute** | Zero matching chunks exist in Chroma. System must abstain/refuse. | LOW |
| **Out of Domain** | 4 | **Absolute** | Completely outside interview domain. System must detect OOD and bypass retrieval. | LOW |
| **Metadata Direct** | 2 | **Absolute** | Can be answered deterministically from system metadata catalog with 0 LLM calls. | LOW |
| **AI Startup Intelligence** | 10 | **High** | Chunks must match company metadata in the 122-record structured dataset. | LOW |
| **Topic Factual** | 7 | **High** | Evidence must cover the requested computer science topic. | LOW |
| **Behavioral Questions** | 3 | **Moderate** | Relevant documents must provide STAR framework structure or company-specific principles. | **HIGH** |
| **Query Rewriting** | 1 | **High** | Proper evaluation requires conversational history context. | LOW |
| **Ambiguous** | 1 | **Low** | No single correct answer; requires clarifying broad guidance. | **HIGH** |

---

## 3. Circular Evaluation Analysis

### A. What Was Circular in the Baseline?
1. **`required_retrieval_behavior`**: In `create_datasets.py`, this field was generated via:
   ```python
   if tc.category == 'Exact Lexical': req_behavior = 'BM25'
   elif tc.category in ['Semantic Retrieval', 'Behavioral Questions']: req_behavior = 'Dense'
   elif tc.category in ['Multi-Company Comparison', 'Multi-Round']: req_behavior = 'Multi-Hop'
   ```
   Evaluating whether the agent selected `BM25` on `Exact Lexical` queries is **not** an evaluation against natural ground truth; it is merely evaluating whether the agent's planner followed the dataset creator's heuristic rule.
2. **`expected_route` vs Routing Accuracy**:
   The reported '76.36% Routing Accuracy' is properly defined as **Agreement with Predefined System Routing Policy**, rather than objective correctness. For example, routing a multi-topic question to `SINGLE_HOP` might retrieve all needed information in one pass if the documents are co-located, making `SINGLE_HOP` superior in latency and token cost even if the policy expected `MULTI_HOP`.

### B. What is Truly Non-Circular & Empirically Trustworthy?
1. **Retrieval Ranking Metrics (Recall, Precision, MRR, MAP, NDCG)**:
   The candidate chunks retrieved by BM25, Dense, Hybrid, and Cross-Encoder were evaluated against `relevant_chunk_ids` linked to actual physical documents in the corpus. This provides a genuine, objective ranking comparison.
2. **Abstention Accuracy (90.91%)**:
   The unindexed companies (Figma, Kroger, Notion, Citadel) do not exist in Chroma. The system's refusal to hallucinate is an objective ground truth measurement.
3. **Latency, Token Usage, and API Cost**:
   Direct hardware/API telemetry. Zero circularity.
4. **Security Robustness (55.0% Detection)**:
   Adversarial payloads vs benign controls. Zero circularity.

---

## 4. Recommendations for Phase B (Jev Integration)

1. **Rename 'Routing Accuracy' to 'Policy Routing Agreement'** in all scientific comparisons.
2. **Do not use `required_retrieval_behavior` as an objective metric**; instead, measure downstream retrieval quality (MRR, NDCG@5) and latency to evaluate whether Jev's routing decisions produce superior outcomes.
3. **Focus Jev on the 3 objectively verifiable decision points**:
   - Pre-Retrieval Security Classification (replacing heuristic regex that had 45% false negatives)
   - Evidence Sufficiency & Abstention (replacing string-matching abstention heuristics)
   - Strategic Retrieval Routing (calibrated selection between single-hop, dense, hybrid, or bypass)
