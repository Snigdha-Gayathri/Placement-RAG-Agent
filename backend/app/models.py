"""Pydantic request/response models for the secure RAG API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RetrievedItem(BaseModel):
    company: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=1, max_length=4000)
    tags: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=12000)
    session_id: str | None = Field(default=None, max_length=128)


class GuardrailMeta(BaseModel):
    request_id: str
    injection_score: float
    discarded_chunks: int
    chunk_count: int
    warning: str | None = None


class ChatResponse(BaseModel):
    answer: str
    meta: GuardrailMeta


class ReindexResponse(BaseModel):
    status: str
    chunks_indexed: int


class HealthResponse(BaseModel):
    status: str
    gemini: bool
    vector_index: bool
    readiness: bool


class SecurityStatusResponse(BaseModel):
    status: str
    config: dict[str, int | float | list[str]]
