"""Retrieved-chunk validation for poisoning and relevance controls."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .config import SecurityConfig
from .utils import jaccard_similarity, normalize_text


@dataclass(frozen=True)
class RetrievedChunk:
    source: str
    text: str
    similarity: float


@dataclass(frozen=True)
class RetrievalGuardResult:
    safe_chunks: list[RetrievedChunk]
    discarded_count: int
    reasons: list[str]


class RetrievalGuard:
    """Filter poisoned or irrelevant chunks before context construction."""

    def __init__(self, config: SecurityConfig) -> None:
        self._config = config

    def filter_chunks(self, query: str, chunks: list[RetrievedChunk]) -> RetrievalGuardResult:
        safe: list[RetrievedChunk] = []
        seen: set[str] = set()
        reasons: list[str] = []
        discarded = 0

        for chunk in sorted(chunks, key=lambda c: c.similarity, reverse=True):
            if len(safe) >= self._config.max_retrieved_chunks:
                break

            text = normalize_text(chunk.text)

            if len(text) > self._config.max_context_length:
                discarded += 1
                reasons.append("chunk_too_long")
                continue

            blocked = False
            for pattern in self._config.blocked_retrieval_patterns:
                if re.search(pattern, text, flags=re.IGNORECASE):
                    blocked = True
                    break
            if blocked:
                discarded += 1
                reasons.append("retrieval_block_pattern")
                continue

            score = max(chunk.similarity, jaccard_similarity(query, text))
            if score < self._config.similarity_threshold:
                discarded += 1
                reasons.append("low_similarity")
                continue

            fingerprint = re.sub(r"\W+", "", text.lower())[:400]
            if fingerprint in seen:
                discarded += 1
                reasons.append("duplicate_chunk")
                continue

            seen.add(fingerprint)
            safe.append(RetrievedChunk(source=chunk.source, text=text, similarity=score))

        return RetrievalGuardResult(safe_chunks=safe, discarded_count=discarded, reasons=reasons)
