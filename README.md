# 🎯 Placement RAG Agent

**A production-grade interview prep RAG assistant with a defense-in-depth security pipeline — Gemini-only, secure by design.**

Placement RAG Agent is an interview-prep RAG application that keeps its existing React chat UX but wraps every request in a **layered security pipeline** — input validation, prompt-injection detection, rate limiting, retrieval guarding, context sanitization, output validation, and grounding verification — before and after a single, tightly-scoped call to Gemini.

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Security Architecture](#-security-architecture)
- [Threat Model Coverage](#-threat-model-coverage)
- [Repository Structure](#-repository-structure)
- [Configuration](#-configuration)
- [Local Development](#-local-development)
- [Production Deployment](#-production-deployment)
- [Testing](#-testing)
- [Security Logging](#-security-logging)
- [Limitations](#-limitations--future-work)
- [License](#-license)

## Why This Exists

RAG chat assistants for interview prep are an easy target for prompt injection — through both direct chat input and poisoned retrieved documents. This project treats that threat seriously: every request passes through independent, composable guard modules rather than relying on the LLM alone to "be careful."

## 🔒 Security Architecture

The request pipeline is implemented as independent, testable modules:

```
User Request
     │
     ▼
Input Validation
     │
     ▼
Prompt Injection Detection
     │
     ▼
Rate Limiter
     │
     ▼
Retriever
     │
     ▼
Retrieved Chunk Validation
     │
     ▼
Context Sanitization
     │
     ▼
       Gemini
     │
     ▼
Output Validation
     │
     ▼
Output Sanitization
     │
     ▼
Grounding Verification
     │
     ▼
Final Response
```

## 🛡️ Threat Model Coverage

| Threat | Mitigation |
|---|---|
| Prompt injection / multi-turn instruction hijacking | `security/prompt_injection.py` scoring + thresholding |
| Indirect injection via retrieved text | `security/retrieval_guard.py` chunk validation |
| Document / retrieval poisoning | Retrieved chunk validation + context sanitization |
| Jailbreaks and roleplay attacks | Prompt injection detector + output validation |
| Prompt leakage / system prompt extraction | Output sanitizer strips sensitive disclosures |
| Sensitive output disclosure (keys, tokens, traces) | `security/output_sanitizer.py` |
| Oversized input / flooding | Input validation + sliding-window rate limiter |
| Hallucination / unsupported claims | `security/hallucination_guard.py` + `security/grounding.py` |
| API abuse | `security/rate_limiter.py` (sliding window) |

## 📁 Repository Structure

```
Placement-RAG-Agent/
├── src/
│   └── App.jsx                    # React frontend (chat UX, sends { "query": "..." })
├── backend/
│   └── app/
│       ├── main.py                # FastAPI entrypoint
│       └── service.py             # Secure pipeline orchestrator
├── security/
│   ├── config.py                  # Guardrail configuration
│   ├── input_validator.py
│   ├── prompt_injection.py
│   ├── rate_limiter.py
│   ├── retrieval_guard.py
│   ├── context_sanitizer.py
│   ├── hallucination_guard.py
│   ├── grounding.py
│   ├── output_validator.py
│   ├── output_sanitizer.py
│   ├── logger.py
│   ├── utils.py
│   └── constants.py
├── documents/                     # Source documents for retrieval
├── tests/security/                # Security test suite
├── .env.example
└── render.yaml                    # Render blueprint (API + static UI)
```

## ⚙️ Configuration

All guardrail thresholds are configurable via environment variables. See `.env.example` for the full template.

**Required:**

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Gemini API key (server-side only) |

**Frontend:**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL — defaults to same-origin if omitted |

**Guardrail thresholds (defaults shown):**

| Variable | Default |
|---|---|
| `MAX_QUERY_LENGTH` | `2000` |
| `MAX_CONTEXT_LENGTH` | `12000` |
| `MAX_OUTPUT_TOKENS` | `800` |
| `MAX_RETRIEVED_CHUNKS` | `8` |
| `RATE_LIMIT` | `30` |
| `RATE_WINDOW_SECONDS` | `60` |
| `SIMILARITY_THRESHOLD` | `0.12` |
| `HALLUCINATION_THRESHOLD` | `0.45` |
| `PROMPT_INJECTION_THRESHOLD` | `0.65` |
| `ALLOWED_FILE_TYPES` | `txt,md,pdf,docx` |

## 🚀 Local Development

```bash
# 1. Frontend dependencies
npm ci

# 2. Backend dependencies
python -m pip install -r backend/requirements.txt

# 3. Configure environment (copy values from .env.example)
cp .env.example .env

# 4. Run backend API
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

# 5. Run frontend
npm run dev
```

The frontend sends chat requests to `/api/chat` and uses the Vite dev proxy. It sends only `{ "query": "..." }` — retrieval and context assembly happen entirely server-side.

> Ensure `VECTOR_DB_PATH` and `GEMINI_API_KEY` are set before running ingest/reindex operations.

## ☁️ Production Deployment

The included `render.yaml` blueprint defines two services:

- `placement-rag-agent-api` — Python API service
- `placement-rag-agent-ui` — Static UI service

Set `GEMINI_API_KEY` on the API service and `VITE_API_BASE_URL` on the UI service.

## 🧪 Testing

```bash
# Editable install for local test runs
python -m pip install -e .

# Run all security tests
python -m pytest tests/security -q

# With coverage
python -m pytest tests/security --cov=security --cov-report=term-missing
```

The security package targets **≥90% coverage**.

## 📝 Security Logging

Structured JSON logs capture: timestamp, request ID, query length, processing time, retrieved/discarded chunk counts, injection score, and guard decisions. Sensitive values are redacted, and raw documents or raw retrieved context are never logged.

## ⚠️ Limitations & Future Work

- Rate limiter is currently in-memory (single-instance scope) — Redis-backed distributed limiting is planned
- Hallucination checks are heuristic, not formally verified — stronger semantic entailment checks are planned
- Retrieval currently consumes client-provided candidate chunks with strict filtering
- Future: cryptographic request signatures between UI and API, integration with dedicated guardrail frameworks (NeMo Guardrails, Guardrails AI, Llama Guard) while keeping Gemini as the sole LLM provider, and policy-driven allow/deny controls per tenant or role

## 📄 License

No license file specified in the repository — add one if you intend to open-source this project.

## Contact

- GitHub: [Snigdha-Gayathri](https://github.com/Snigdha-Gayathri)
- LinkedIn: [snigdha-gayathri](https://linkedin.com/in/snigdha-gayathri)
