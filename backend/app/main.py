"""FastAPI entrypoint for secure Gemini-only RAG backend."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .models import ChatRequest, ChatResponse, HealthResponse, ReindexResponse, SecurityStatusResponse
from .service import SecureRAGService, build_request_context

app = FastAPI(title="Placement RAG Agent Secure API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = SecureRAGService()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return service.health()


@app.get("/security/status", response_model=SecurityStatusResponse)
async def security_status() -> SecurityStatusResponse:
    return service.security_status()


@app.post("/reindex", response_model=ReindexResponse)
async def reindex() -> ReindexResponse:
    try:
        return service.reindex()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Index rebuild failed.") from exc


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, raw_request: Request) -> ChatResponse:
    ctx = build_request_context(raw_request.client.host if raw_request.client else None)
    try:
        return await service.process(request, ctx)
    except PermissionError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except ValueError:
        raise HTTPException(status_code=400, detail="Request could not be processed.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Internal processing error.") from exc
