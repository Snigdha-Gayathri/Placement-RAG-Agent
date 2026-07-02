"""Secure RAG orchestration service with layered guardrails."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
import os

from security import (
    ContextSanitizer,
    GroundingVerifier,
    HallucinationGuard,
    InputValidator,
    OutputSanitizer,
    OutputValidator,
    PromptInjectionDetector,
    RetrievalGuard,
    SecurityLogger,
    SlidingWindowRateLimiter,
    load_config,
)

from .gemini_client import GeminiClient
from .models import ChatRequest, ChatResponse, GuardrailMeta, ReindexResponse, HealthResponse, SecurityStatusResponse
from .retriever import Retriever
from .vector_store import VectorStore


@dataclass
class RequestContext:
    client_ip: str
    request_id: str


class SecureRAGService:
    """Production-style security pipeline for Gemini-based RAG."""

    def __init__(self) -> None:
        self.config = load_config()
        self.logger = SecurityLogger()
        self.input_validator = InputValidator(self.config)
        self.injection_detector = PromptInjectionDetector(self.config)
        self.rate_limiter = SlidingWindowRateLimiter(self.config)
        self.retriever = Retriever()
        self.retrieval_guard = RetrievalGuard(self.config)
        self.context_sanitizer = ContextSanitizer(self.config)
        self.gemini = GeminiClient()
        self.output_validator = OutputValidator(self.config)
        self.output_sanitizer = OutputSanitizer()
        self.grounding = GroundingVerifier()
        self.hallucination_guard = HallucinationGuard()
        self.vector_store = VectorStore(
            index_path=os.getenv("VECTOR_DB_PATH", "data/vector_index.json"),
            documents_path=os.getenv("DOCUMENTS_PATH", "documents"),
            chunk_size=int(os.getenv("CHUNK_SIZE", "500")),
            chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "80")),
        )
        self.vector_store.load()

    async def process(self, request: ChatRequest, ctx: RequestContext) -> ChatResponse:
        started = time.perf_counter()

        validation = self.input_validator.validate(request.query)
        if not validation.is_valid:
            self.logger.info(
                "input_rejected",
                request_id=ctx.request_id,
                query_length=len(request.query),
                reasons=validation.reasons,
            )
            raise ValueError("Request could not be processed.")

        injection = self.injection_detector.detect(validation.normalized_query)
        if injection.action == "block":
            self.logger.info(
                "injection_blocked",
                request_id=ctx.request_id,
                injection_score=injection.risk_score,
                reasons=injection.reasons,
            )
            raise ValueError("Request could not be processed.")

        limit = self.rate_limiter.allow(ctx.client_ip, request.session_id)
        if not limit.allowed:
            self.logger.info(
                "rate_limited",
                request_id=ctx.request_id,
                retry_after=limit.retry_after_seconds,
            )
            raise PermissionError(f"Too many requests. Retry in {limit.retry_after_seconds} seconds.")

        retrieved = self.retriever.retrieve(
            validation.normalized_query,
            self.vector_store.search(validation.normalized_query, top_k=self.config.max_retrieved_chunks),
        )
        guarded = self.retrieval_guard.filter_chunks(validation.normalized_query, retrieved)

        safe_context_lines = [f"[{c.source}] {c.text}" for c in guarded.safe_chunks]
        merged_context = "\n".join(safe_context_lines)
        sanitized_context = self.context_sanitizer.sanitize(merged_context)

        if not sanitized_context:
            answer = self.grounding.fallback()
            return ChatResponse(
                answer=answer,
                meta=GuardrailMeta(
                    request_id=ctx.request_id,
                    injection_score=injection.risk_score,
                    discarded_chunks=guarded.discarded_count,
                    chunk_count=0,
                    warning="No safe evidence available",
                ),
            )

        system_prompt = (
            "You are an expert IT interview assistant. "
            "Only answer using the provided evidence. "
            "If evidence is insufficient, respond exactly: "
            "I couldn't find sufficient information in the indexed documents."
        )
        user_prompt = (
            f"Query: {validation.normalized_query}\n\n"
            f"Evidence:\n{sanitized_context}\n\n"
            "Return concise, practical guidance and cite source labels like [Company]."
        )

        raw_answer = await self.gemini.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_output_tokens=self.config.max_output_tokens,
        )

        output_check = self.output_validator.validate(raw_answer)
        sanitized_answer = self.output_sanitizer.sanitize(raw_answer)

        evidence_chunks = [c.text for c in guarded.safe_chunks]
        hallucinated = self.hallucination_guard.is_hallucinated(
            sanitized_answer,
            evidence_chunks,
            self.config.hallucination_threshold,
        )
        grounded = self.grounding.verify(
            sanitized_answer,
            evidence_chunks,
            threshold=max(0.18, self.config.similarity_threshold),
        )

        warning = None
        final_answer = sanitized_answer
        if not output_check.is_safe or hallucinated or not grounded:
            final_answer = self.grounding.fallback()
            warning = "Response replaced due to safety or grounding checks"

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        self.logger.info(
            "request_processed",
            request_id=ctx.request_id,
            query_length=len(validation.normalized_query),
            processing_ms=elapsed_ms,
            retrieved_chunk_count=len(guarded.safe_chunks),
            discarded_chunks=guarded.discarded_count,
            injection_score=injection.risk_score,
            guard_reasons=guarded.reasons,
        )

        if injection.action == "warn" and not warning:
            warning = "Potential prompt-injection pattern detected and mitigated"

        return ChatResponse(
            answer=final_answer,
            meta=GuardrailMeta(
                request_id=ctx.request_id,
                injection_score=injection.risk_score,
                discarded_chunks=guarded.discarded_count,
                chunk_count=len(guarded.safe_chunks),
                warning=warning,
            ),
        )

    def reindex(self) -> ReindexResponse:
        chunks = self.vector_store.build_chunks_from_documents()
        self.vector_store.rebuild(chunks)
        self.logger.info("vector_index_rebuilt", chunks_indexed=len(chunks))
        return ReindexResponse(status="ok", chunks_indexed=len(chunks))

    def health(self) -> HealthResponse:
        vector_ready = self.vector_store.is_ready()
        gemini_ready = bool(self.gemini._api_key)
        readiness = vector_ready and gemini_ready
        return HealthResponse(status="ok", gemini=gemini_ready, vector_index=vector_ready, readiness=readiness)

    def security_status(self) -> SecurityStatusResponse:
        return SecurityStatusResponse(
            status="ok",
            config={
                "max_query_length": self.config.max_query_length,
                "max_context_length": self.config.max_context_length,
                "max_output_tokens": self.config.max_output_tokens,
                "max_retrieved_chunks": self.config.max_retrieved_chunks,
                "rate_limit": self.config.rate_limit,
                "similarity_threshold": self.config.similarity_threshold,
                "hallucination_threshold": self.config.hallucination_threshold,
                "prompt_injection_threshold": self.config.prompt_injection_threshold,
                "blocked_input_patterns": self.config.blocked_input_patterns,
            },
        )


def build_request_context(client_ip: str | None) -> RequestContext:
    return RequestContext(client_ip=client_ip or "unknown", request_id=str(uuid.uuid4()))
