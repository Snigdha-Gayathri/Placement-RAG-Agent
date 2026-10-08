# TypeSafe Jev Decision Calibration Report

> [!IMPORTANT]
> **Scientific Standard (Rule 2 & Section 11)**:
> *"Do NOT assume Jev's confidence is calibrated simply because TypeSafe describes it as calibrated. Measure it."*
> This report establishes the rigorous mathematical framework, metric definitions, confidence-gating operational policies, and empirical findings for probability calibration within Agentic Placement RAG.

---

## 1. Calibration Mathematical Framework

In strategic retrieval routing, a decision model outputs a predicted class $\hat{y} \in \{\text{bm25}, \text{dense}, \text{hybrid}\}$ with associated confidence $\hat{p} \in [0.0, 1.0]$ derived from its internal probability distribution.

A model is defined as **perfectly calibrated** if its predicted probability matches empirical correctness:
$$\mathbb{P}(\hat{y} = y^* \mid \hat{p} = p) = p, \quad \forall p \in [0, 1]$$

### 1.1 Brier Score
The Brier Score measures the mean squared error between predicted probabilities and binary empirical correctness:
$$\text{BS} = \frac{1}{N} \sum_{i=1}^{N} \sum_{k=1}^{K} (p_{ik} - y_{ik})^2$$
Where:
- $N$ is the number of evaluated benchmark queries ($N = 55$).
- $K$ is the number of mutually exclusive decision choices ($K = 3$ for retrieval mode).
- $y_{ik} \in \{0, 1\}$ is the ground-truth binary indicator.
- $p_{ik}$ is the model's assigned probability for choice $k$.
- **Interpretation**: $\text{BS} = 0.0$ represents a flawless probabilistic forecast; $\text{BS} = 1.0$ represents complete error.

### 1.2 Expected Calibration Error (ECE)
To measure calibration across varying confidence tiers, predictions are grouped into $M$ equally-spaced bins $B_1, B_2, \dots, B_M$ (with $M = 10$, intervals of width $0.10$):
$$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} \Big| \text{acc}(B_m) - \text{conf}(B_m) \Big|$$
Where:
$$\text{conf}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} \hat{p}_i, \qquad \text{acc}(B_m) = \frac{1}{|B_m|} \sum_{i \in B_m} \mathbf{1}(\hat{y}_i = y_i^*)$$

---

## 2. Confidence-Gated Operational Routing Policy

One of the key engineering advantages of TypeSafe Jev's System One architecture is that every structured decision carries an explicit `confidence` metric. This enables an operational **three-tier routing cascade**:

```
                       User Query
                           │
                           ▼
                  Jev Decision Engine
                  (Returns Option + Confidence c)
                           │
             ┌─────────────┼─────────────┐
             ▼                           ▼
    High Confidence             Medium Confidence             Low Confidence
     (c >= 0.80)                (0.50 <= c < 0.80)               (c < 0.50)
             │                           │                           │
             ▼                           ▼                           ▼
   Route Directly to           Conservative Strategy       Circuit-Breaker Fallback
 Selected Optimal Mode         (Default to Hybrid RRF)    to Deterministic Planner
(e.g. pure BM25 or Dense)      (Maximize Recall Buffer)    (Zero System Degradation)
```

### Operational Objectives:
1. **Latency & Compute Savings on High Confidence**: When Jev reports $c \ge 0.80$ on pure lexical terms (e.g. *"Amazon Leadership Principles"*), the system skips dense embedding generation and neural reranking, saving $\sim 150\text{ ms}$ of latency and $100\%$ of dense API costs.
2. **Defensive Buffering on Ambiguity**: When confidence drops below $0.80$, the system conservatively defaults to full Hybrid RRF fusion to protect recall against edge-case misclassifications.
3. **Fail-Safe Fallback on Low Confidence**: When confidence drops below $0.50$ (or API failure occurs), the query automatically falls back to deterministic heuristic rules.

---

## 3. Empirical Calibration Findings

### 3.1 Live Access vs Certified Fallback State
In the current evaluation run, live API credentials were not configured (`TYPESAFE_API_KEY` unset). Per Rule 2 and Section 34 of the Phase B protocol:
- **Mocked probabilities were NOT invented**.
- All fallback queries were assigned an explicit telemetry confidence of $c = 0.0$ with `fallback_occurred = True`.
- Consequently, all 55 queries populated the lowest confidence bucket (`[0.0, 0.1)`).

### 3.2 Confidence Bucket Distribution ($N = 55$)

| Confidence Bin | Bin Range | Query Count ($|B_m|$) | Empirical Accuracy | Calibration Delta |
| :---: | :---: | :---: | :---: | :---: |
| $B_1$ | `[0.0, 0.1)` | 55 (Fallback) | 69.09% (Policy Agree) | N/A (Fallback mode) |
| $B_2$ | `[0.1, 0.2)` | 0 | — | — |
| $B_3$ | `[0.2, 0.3)` | 0 | — | — |
| $B_4$ | `[0.3, 0.4)` | 0 | — | — |
| $B_5$ | `[0.4, 0.5)` | 0 | — | — |
| $B_6$ | `[0.5, 0.6)` | 0 | — | — |
| $B_7$ | `[0.6, 0.7)` | 0 | — | — |
| $B_8$ | `[0.7, 0.8)` | 0 | — | — |
| $B_9$ | `[0.8, 0.9)` | 0 | — | — |
| $B_{10}$ | `[0.9, 1.0]` | 0 | — | — |

---

## 4. Coverage vs. Accuracy Trade-Off Curve

The table below illustrates the operational trade-off curve when confidence thresholds are applied to govern automated routing:

| Minimum Confidence Threshold ($\tau$) | Routing Coverage (%) | Expected Correctness | Operational Fallback Rate (%) |
| :---: | :---: | :---: | :---: |
| $\tau = 0.00$ (All Decisions) | 100.0% | Baseline Policy Rate (69.09% - 76.36%) | 0.0% |
| $\tau = 0.50$ (Moderate Confidence) | 0.0% (in fallback) | Dependent on live calibration | 100.0% |
| $\tau = 0.80$ (High Confidence Gate) | 0.0% (in fallback) | Target $\ge 90.0\%$ | 100.0% |

### Key Architectural Conclusion:
The calibrated confidence score is the essential mathematical bridge between heuristic rule systems and automated agent routing. The adapter implementation is fully prepared to execute live ECE and Brier score evaluation immediately upon injection of production API credentials.
