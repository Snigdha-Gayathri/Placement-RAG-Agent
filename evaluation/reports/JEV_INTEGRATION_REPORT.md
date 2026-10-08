# TypeSafe AI Jev / System One Integration Report

> [!IMPORTANT]
> **Phase B Milestone**: Comprehensive architectural and empirical report on the investigation, adapter design, typed interface implementation, and circuit-breaker verification of **TypeSafe AI's Jev (System One)** model within the Agentic Placement RAG architecture.
>
> In accordance with **Rule 2: Do not fabricate Jev results** and **Section 34: Stop Conditions**, this report documents verified research, adapter contracts, unit/interface test results, and fallback behaviors.

---

## 1. Official TypeSafe AI Research & Specifications

All information recorded below was gathered directly from official TypeSafe AI sources on **September 27, 2026**:
- **Official Documentation Index**: [`https://docs.typesafe.ai/llms.txt`](https://docs.typesafe.ai/llms.txt)
- **Official Documentation**: [`https://docs.typesafe.ai`](https://docs.typesafe.ai)
- **API Reference**: [`https://docs.typesafe.ai/api.md`](https://docs.typesafe.ai/api.md)
- **Models & Pricing Reference**: [`https://docs.typesafe.ai/models.md`](https://docs.typesafe.ai/models.md)
- **Python SDK Documentation**: [`https://docs.typesafe.ai/sdk/python.md`](https://docs.typesafe.ai/sdk/python.md)
- **Primitives (Choice, Score, Noul)**: [`https://docs.typesafe.ai/primitives.md`](https://docs.typesafe.ai/primitives.md)
- **Confidence Modeling**: [`https://docs.typesafe.ai/confidence.md`](https://docs.typesafe.ai/confidence.md)
- **Date Accessed**: `September 27, 2026`

### 1.1 Model & API Identity
- **Model Family**: System One (designed for fast, structured decision-making, classification, and routing in software-to-software pipelines rather than conversational text generation).
- **Flagship Model**: `jev-latest` (resolving to versioned ID `jev-1.13.0`).
- **Official Evaluation Endpoint**:
  ```http
  POST https://api.typesafe.ai/v1/systemone
  Authorization: Bearer <TYPESAFE_API_KEY>
  Content-Type: application/json
  ```
- **Supported Languages / SDKs**:
  - Python: `typesafe-sdk` (v0.7.2 verified and installed on PyPI)
  - TypeScript/JavaScript: `@typesafe-ai/sdk`
  - Raw HTTP / cURL: REST API supporting any standard client

### 1.2 The Three Question Primitives
TypeSafe Jev does not output free-form tokens; it evaluates an unstructured or structured `state` across a dictionary of typed `questions` in parallel:
1. **`Choice`**:
   - **Purpose**: Selects one label from a predefined set of up to 255 options.
   - **Request Criteria**: Map of option strings to rubric descriptions (e.g. `{"bm25": "Exact syntax", "dense": "Behavioral", "hybrid": "Mixed"}`).
   - **Response Return**: `choice` (highest probability option), `probabilities` (dictionary of floats summing to 1.0), and `confidence` (float in $[0.0, 1.0]$).
2. **`Score`**:
   - **Purpose**: Rates content along an ordered scale of 2 to 10 levels.
   - **Request Criteria**: Array of level descriptions (e.g. `["Calm", "Frustrated", "Very angry"]`).
   - **Response Return**: `score` (probability-weighted numeric value), `legend`, `probabilities`, and `confidence`.
3. **`Noul`**:
   - **Purpose**: A binary yes/no question returning the probability that the condition is true.
   - **Request Criteria**: Optional `{"true": "...", "false": "..."}`.
   - **Response Return**: `noul` (float in $[0.0, 1.0]$ representing $P(\text{yes})$).

### 1.3 Pricing, Limits, and Rate Controls
- **Pricing**:
  - Input tokens: **$0.042 per million tokens** ($42 per billion tokens).
  - Output tokens: **Free ($0.00)**.
- **Context Length**: 64k tokens total per request; up to 32k tokens for `state` plus the longest question.
- **Rate Limits**: 250,000 tokens per second; 1,200 requests per minute.
- **Error Behavior**:
  - `401 Unauthorized`: Missing or invalid API key.
  - `422 Unprocessable Entity`: Request body validation failure (e.g. malformed criteria).
  - `429 Too Many Requests`: Rate limit exceeded (honors `retry-after` header).
  - `529 Overloaded`: Temporary service overload (requires exponential backoff).

---

## 2. Adapter Architecture & Design

To avoid tightly coupling Jev directly into application code, we designed a modular `DecisionBackend` abstraction in `backend/core/decision/`.

```
                        User Query
                            │
                            ▼
                 ┌──────────────────────┐
                 │  Input Security GW   │
                 │ (Deterministic Regex)│
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   DecisionBackend    │
                 │     Abstraction      │
                 └──────────┬───────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│HeuristicDecisionBack. │       │   JevDecisionBackend  │
│(Frozen Baseline Policy)       │ (System One / Jev API)│
└───────────────────────┘       └───────────┬───────────┘
                                            │
                                    [Circuit Breaker]
                                            │ (If timeout / 429 / unconfigured)
                                            ▼
                                ┌───────────────────────┐
                                │ Fallback to Heuristic │
                                └───────────────────────┘
```

### 2.1 File Structure
- `backend/core/decision/models.py`: Strongly typed Pydantic models for `RetrievalStrategyDecision`, `SufficiencyDecision`, `SecurityDecision`, and `DecisionLogRecord`.
- `backend/core/decision/base.py`: Abstract `DecisionBackend` interface.
- `backend/core/decision/heuristic.py`: `HeuristicDecisionBackend` implementing 100% exact parity with the frozen baseline.
- `backend/core/decision/jev.py`: `JevDecisionBackend` integrating `typesafe_sdk.AsyncTypeSafeClient` with strict typing, timeout handling, retry policy, circuit breaker, and telemetry logging.
- `backend/core/decision/factory.py`: Configuration factory reading `DECISION_BACKEND=heuristic|jev`.

### 2.2 Decision Surface Definition
The primary experiment focuses on **Strategic Retrieval Routing**:
1. **`retrieval_mode`** (`Choice`):
   - `bm25`: Exact entity names, algorithmic terms, leadership principles, code syntax.
   - `dense`: Abstract behavioral questions, conceptual topics without named companies.
   - `hybrid`: Mixed queries (company + technical topics) requiring dual recall.
2. **`hop_mode`** (`Choice`):
   - `single_hop`: Single entity / single round pass.
   - `multi_hop`: Multi-company comparisons or multi-stage round synthesis.
3. **`query_transformation`** (`Choice`):
   - `none`: Direct standalone query.
   - `rewrite`: Conversational follow-ups, pronoun ambiguity.
   - `hyde`: Severe vocabulary mismatch requiring hypothetical document expansion.
4. **`route_type`** (`Choice`):
   - `retrieval_required`: Standard technical interview query.
   - `metadata_direct`: System catalog inventory lookup (0 retrieval calls).
   - `out_of_domain`: Non-interview query (immediate abstention).

---

## 3. Circuit Breaker & Fallback Guarantees

Under the enterprise resilience contract:
1. **Unconfigured Key**: If `TYPESAFE_API_KEY` is empty, Jev backend logs an informational fallback notice, sets `fallback_occurred=True`, sets `confidence=0.0`, and returns the deterministic heuristic decision in $<1\text{ ms}$.
2. **Timeout**: Configurable via `JEV_TIMEOUT_SECONDS` (default: 3.0s). If the API does not respond within this window, execution aborts and seamlessly engages heuristic fallback.
3. **HTTP 429 Rate Limiting / 529 Overload**: Handled via exponential backoff; if retries are exhausted, the circuit breaker triggers without crashing the user application.
4. **Malformed Output / Validation Failure**: If probabilities do not sum to $1.0 \pm 0.10$ or confidence is out of $[0, 1]$, Pydantic validation rejects the payload and triggers safe fallback.

---

## 4. Test Verification Suite

All adapter functionality, baseline equivalence, and failure scenarios are covered by automated unit and interface tests in `tests/test_decision_backend.py`.

```text
============================= test session starts =============================
plugins: anyio-4.14.1, langsmith-0.11.0, cov-5.0.0
collected 10 items

tests/test_decision_backend.py::test_heuristic_backend_matches_baseline_planner_identically[asyncio] PASSED [ 10%]
tests/test_decision_backend.py::test_jev_backend_unconfigured_fallback[asyncio] PASSED [ 20%]
tests/test_decision_backend.py::test_jev_adapter_mock_interface_conformance[asyncio] PASSED [ 30%]
tests/test_decision_backend.py::test_jev_adapter_timeout_handling[asyncio] PASSED [ 40%]
tests/test_decision_backend.py::test_jev_adapter_invalid_response_handling[asyncio] PASSED [ 50%]
tests/test_decision_backend.py::test_jev_rate_limiting_fallback[asyncio] PASSED [ 60%]
tests/test_decision_backend.py::test_security_jev_failure_preserves_deterministic_failsafe[asyncio] PASSED [ 70%]
tests/test_decision_backend.py::test_evidence_sufficiency_unindexed_company_deterministic_safety[asyncio] PASSED [ 80%]
tests/test_decision_backend.py::test_confidence_validation PASSED        [ 90%]
tests/test_decision_backend.py::test_probability_validation PASSED       [100%]

============================= 10 passed in 1.16s ==============================
```

> **Rule 2 Notice**: The mock tests above are strictly labeled as **interface and integration tests only**. They verify protocol conformance and error handling. They are NOT Jev evaluation results.
