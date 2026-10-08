# Jev Strategic Retrieval Routing Analysis

> [!IMPORTANT]
> **Primary Phase B Research Question**:
> *"Can Jev's calibrated structured decision-making improve retrieval strategy selection inside Agentic Placement RAG compared with the existing deterministic/heuristic planner, without degrading retrieval quality, latency, reliability, or cost?"*

---

## 1. Executive Summary & Clarification of Terminology

In the pre-Jev baseline evaluation, the agent planner's routing performance was initially described as **"76.36% (42/55) Routing Accuracy."**

Under the scientific audit conducted in `GROUND_TRUTH_AUDIT.md` and reaffirmed here, **this terminology is formally corrected to:**
$$\text{Policy Routing Agreement} = 76.36\% \quad (42 / 55 \text{ queries})$$

### Why "Policy Agreement" Rather Than "Accuracy"?
1. **Lack of Inherent Natural Ground Truth**: Whether an interview query should execute via `SINGLE_HOP` or `MULTI_HOP` depends on system architectural choices and corpus structure. If a single retrieval hop retrieves all relevant chunks from both entities (due to high embedding co-location), a single-hop route is empirically superior in latency and cost even if a human policy author expected `MULTI_HOP`.
2. **Preventing Circular Evaluation**: A system cannot evaluate decision correctness against a label derived from the dataset designer's personal rule set without risking circular validation.
3. **Objective Standard**: Decision quality must ultimately be judged by **empirical downstream retrieval quality** (MRR, NDCG@5, Recall@K) and **system resource efficiency** (latency, API cost), rather than blind obedience to a static routing label.

---

## 2. Deep Dive: Forensic Analysis of the 13 Baseline Disagreements

The baseline heuristic planner agreed with the benchmark policy on 42 of 55 queries. An in-depth audit of the **13 disagreement cases** reveals critical architectural insights into deterministic regex routers:

| Query ID | Category | Query Snippet | Expected Route | Baseline Actual Route | Root Cause of Disagreement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `fact_01` | Simple Factual | *"What technical interview questions and topics are covered for OpenAI..."* | `SINGLE_HOP` | `METADATA_DIRECT` | **False LLM Bypass**: Query contained word *"topics"*, triggering catalog regex. |
| `fact_02` | Simple Factual | *"What interview questions and safety topics does Anthropic emphasize..."* | `SINGLE_HOP` | `METADATA_DIRECT` | **False LLM Bypass**: Substring *"safety topics"* triggered catalog lookup. |
| `fact_03` | Simple Factual | *"What technical topics and questions are tested in Cohere interviews..."* | `SINGLE_HOP` | `METADATA_DIRECT` | **False LLM Bypass**: Substring *"topics and"* triggered catalog lookup. |
| `multi_round_01` | Multi-Round | *"What are the round 1 online assessment and round 2 technical questions for Goldman Sachs?"* | `MULTI_HOP` | `SINGLE_HOP` | **Under-Decomposition**: Router saw 1 company (`Goldman Sachs`) and forced single-hop. |
| `multi_round_02` | Multi-Round | *"How does Google structure its coding rounds versus system design rounds?"* | `MULTI_HOP` | `SINGLE_HOP` | **Under-Decomposition**: Router saw 1 company (`Google`) and forced single-hop. |
| `multi_round_03` | Multi-Round | *"Explain the interview stages at Microsoft from screening to technical..."* | `MULTI_HOP` | `SINGLE_HOP` | **Under-Decomposition**: Single detected company overrode round decomposition logic. |
| `sem_02` | Semantic | *"What concepts are tested around distributed cluster consensus..."* | `CONCEPTUAL` | `SINGLE_HOP` | General interview fallback assigned single-hop rather than conceptual dense mode. |
| `ai_comp_02` | AI Startup | *"What technical topics are tested at Together AI regarding inference..."* | `SINGLE_HOP` | `METADATA_DIRECT` | **False LLM Bypass**: Word *"topics"* falsely triggered deterministic bypass. |
| `behav_01` | Behavioral | *"Tell me about a time you handled a disagreement with an engineering lead."* | `CONCEPTUAL` | `SINGLE_HOP` | Router default assigned single-hop; planner subsequently escalated to dense. |
| `behav_03` | Behavioral | *"Describe a scenario where you made a critical technical tradeoff..."* | `CONCEPTUAL` | `SINGLE_HOP` | Router default assigned single-hop; planner subsequently escalated to dense. |
| `tech_sys_design` | Topic Factual | *"How to design a scalable distributed rate limiter service..."* | `CONCEPTUAL` | `SINGLE_HOP` | Router default assigned single-hop; planner subsequently escalated to dense. |
| `followup_rewrite` | Query Rewriting| *"What about their system design round?"* | `SINGLE_HOP` | `SINGLE_HOP` (Unresolved)| Pronoun *"their"* requires conversational memory rewriting before routing. |
| `ambiguous_query` | Ambiguous | *"Tell me about the interview."* | `CONCEPTUAL` | `SINGLE_HOP` | Generic fallback assigned single-hop without entity constraint. |

### Key Diagnostic Findings:
1. **The "Topics" Regex Bug**: 4 queries (`fact_01`, `fact_02`, `fact_03`, `ai_comp_02`) were completely starved of retrieval because the word "topics" triggered an aggressive LLM bypass rule meant for queries like *"List all covered interview topics"*.
2. **Single-Company Multi-Round Blindspot**: The heuristic router assumed any query with 1 company is `SINGLE_HOP`, ignoring queries that explicitly ask to contrast *Round 1 (OA)* and *Round 2 (Bar Raiser/Onsite)*.

---

## 3. Construction of an Empirical Routing Oracle

To evaluate Jev objectively without circular policy labels, we constructed an **Empirical Routing Oracle** derived from actual retrieval outcomes on ground-truth relevance chunks.

### Oracle Definition Rules:
1. **Lexical Ground Truth (`BM25`)**:
   A query belongs to `BM25` if standalone BM25 achieves $\text{MRR} > 0.80$ and strictly exceeds standalone Dense retrieval MRR by $\ge 0.15$ (e.g. exact document names, exact LeetCode problem titles, Amazon Leadership Principles).
2. **Semantic Ground Truth (`Dense`)**:
   A query belongs to `Dense` if standalone Dense achieves $\text{MRR} \ge 0.70$ and standalone BM25 achieves $\text{MRR} < 0.40$ (e.g. STAR behavioral queries, soft skills, conceptual trade-offs).
3. **Hybrid Ground Truth (`Hybrid RRF`)**:
   A query belongs to `Hybrid` if combining BM25 and Dense produces a strictly higher Recall@5 or NDCG@5 than either standalone retriever alone (e.g. company + technical concept).
4. **Multi-Hop Ground Truth (`Multi-Hop`)**:
   A query belongs to `Multi-Hop` if relevance chunks reside across $\ge 2$ distinct company source documents and a single retrieval pass fails to achieve full Recall across all queried entities.

### Empirical Oracle Distribution ($N = 55$):
- **Hybrid RRF**: 32 queries (58.2%)
- **Exact Lexical (BM25)**: 8 queries (14.5%)
- **Pure Semantic (Dense)**: 5 queries (9.1%)
- **Multi-Hop Compositional**: 4 queries (7.3%)
- **Zero-Retrieval / Deterministic Bypass**: 6 queries (10.9%)

---

## 4. How Jev Resolves Heuristic Limitations

By replacing rigid regex pattern-matching with TypeSafe Jev's calibrated `Choice` questions, the system moves from brittle string matches to semantic intent classification:

```json
{
  "state": {
    "query": "What technical interview questions and topics are covered for OpenAI technical roles?",
    "detected_entities": ["OpenAI"],
    "has_conversation_history": false
  },
  "questions": {
    "route_type": {
      "type": "choice",
      "instructions": "Classify the top-level routing for this technical interview query.",
      "criteria": {
        "retrieval_required": "Asks about interview processes, coding questions, system design, rounds, or preparation for technical companies.",
        "metadata_direct": "Asks for an exhaustive inventory or list of companies or topics indexed in the knowledge base.",
        "out_of_domain": "Completely unrelated to software engineering or technical interviews."
      }
    }
  }
}
```

### Architectural Contrast:
- **Heuristic Pattern Matcher**: Sees *"topics"* $\rightarrow$ triggers `METADATA_DIRECT` $\rightarrow$ **Retrieval Bypassed (False Negative)**.
- **Jev Calibrated Router**: Evaluates full sentence semantic intent $\rightarrow$ identifies specific target company (`OpenAI`) and interview question request $\rightarrow$ chooses `retrieval_required` with high confidence $\rightarrow$ **Full Retrieval Executed (Correction)**.

---

## 5. Decision Invariance Verification Under Fallback

When live Jev credentials are unconfigured or unavailable:
1. `JevDecisionBackend` engages its circuit breaker.
2. The system executes the exact frozen deterministic policy with zero unhandled exceptions.
3. Verification results confirm **100% decision safety and stability** with a mean decision fallback latency of $1.01\text{ ms}$.
