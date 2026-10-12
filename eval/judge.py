"""LLM-as-a-Judge for RAGAS metrics (Faithfulness and Answer Relevancy).

Includes robust exponential backoff retry for transient 429/503 errors,
regex-resilient JSON parsing, explicit failure logging, and failure counters
(failed calls are logged and excluded from averages rather than penalizing scores as zero).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any

import httpx

from backend.config.settings import get_config

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
MAX_JUDGE_RETRIES = 5
INITIAL_BACKOFF = 2.0


class LLMJudge:
    """Evaluates RAG generation faithfulness and answer relevancy via Gemini."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        cfg = get_config()
        self._api_key = api_key or os.getenv("GEMINI_API_KEY") or cfg.gemini_api_key
        self._model = model or os.getenv("RAG_LLM_MODEL") or os.getenv("GEMINI_MODEL") or getattr(cfg, "llm_model", "gemini-3.1-flash-lite")
        self.total_judge_calls: int = 0
        self.failed_judge_calls: int = 0
        self.retry_count: int = 0

    async def _call_gemini_score(self, prompt: str, score_key: str) -> tuple[float | None, dict[str, Any]]:
        """Call Gemini generateContent with resilient parsing and exponential backoff."""
        self.total_judge_calls += 1
        endpoint = f"{GEMINI_BASE_URL}/{self._model}:generateContent"
        headers = {"x-goog-api-key": self._api_key}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json",
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }

        for attempt in range(1, MAX_JUDGE_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(endpoint, json=payload, headers=headers)

                if resp.status_code in (429, 500, 502, 503, 504):
                    self.retry_count += 1
                    sleep_s = min(60.0, 5.0 * (2 ** (attempt - 1)))
                    logger.warning(
                        "LLM Judge call attempt %d/%d encountered HTTP %d. Backing off for %.1fs...",
                        attempt,
                        MAX_JUDGE_RETRIES,
                        resp.status_code,
                        sleep_s,
                    )
                    await asyncio.sleep(sleep_s)
                    continue

                resp.raise_for_status()
                data = resp.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                if not text:
                    raise ValueError("Empty response text from Gemini judge")

                # 1. Try standard JSON parse
                try:
                    parsed = json.loads(text)
                    if score_key in parsed and parsed[score_key] is not None:
                        val = float(parsed[score_key])
                        return round(max(0.0, min(1.0, val)), 4), parsed
                except Exception:
                    pass

                # 2. Try regex extraction of score_key
                match = re.search(rf'["\']{score_key}["\']\s*:\s*([0-9.]+)', text)
                if match:
                    val = float(match.group(1))
                    reason_match = re.search(r'["\']reasoning["\']\s*:\s*["\']([^"\']+)["\']', text)
                    reasoning = reason_match.group(1) if reason_match else text[:200]
                    return round(max(0.0, min(1.0, val)), 4), {"reasoning": reasoning, "raw": text}

                raise ValueError(f"Could not extract {score_key} from judge response: {text[:150]}")

            except Exception as exc:
                self.retry_count += 1
                sleep_s = min(60.0, 5.0 * (2 ** (attempt - 1)))
                logger.warning(
                    "LLM Judge call attempt %d/%d failed with error: %s. Backing off for %.1fs...",
                    attempt,
                    MAX_JUDGE_RETRIES,
                    exc,
                    sleep_s,
                )
                if attempt == MAX_JUDGE_RETRIES:
                    logger.error("LLM Judge call permanently failed after %d attempts: %s", attempt, exc)
                    self.failed_judge_calls += 1
                    return None, {"error": str(exc)}
                await asyncio.sleep(sleep_s)

        self.failed_judge_calls += 1
        return None, {"error": "Exhausted retries"}

    async def judge_faithfulness(
        self,
        query: str,
        answer: str,
        context_chunks: list[dict[str, Any]],
        should_abstain: bool = False,
    ) -> tuple[float | None, dict[str, Any]]:
        """Evaluate Faithfulness (groundedness of claims against context).
        
        Returns (score, details). If should_abstain=True and answer abstains, score is 1.0.
        If judge call fails, score is None (not 0.0) and failure is logged.
        """
        abstention_phrases = [
            "insufficient evidence",
            "not contain enough evidence",
            "cannot answer",
            "do not have enough information",
            "material does not contain",
            "unable to answer",
            "evidence sufficiency notice",
        ]
        has_abstained = any(p in answer.lower() for p in abstention_phrases)

        if should_abstain:
            if has_abstained:
                return 1.0, {"abstained_correctly": True, "reasoning": "Correctly abstained on unanswerable query"}
            else:
                return 0.0, {"abstained_correctly": False, "reasoning": "Failed to abstain on unanswerable query"}

        if not context_chunks:
            if has_abstained:
                return 1.0, {"reasoning": "Abstained when no context retrieved"}
            return 0.0, {"reasoning": "Context empty but answer generated ungrounded claims"}

        context_text = "\n\n".join(
            f"[Chunk {idx+1}] {c.get('text', '')}"
            for idx, c in enumerate(context_chunks)
        )

        prompt = f"""You are an unbiased, expert RAG evaluator measuring Faithfulness / Groundedness.
Evaluate whether the factual claims made in the Generated Answer are directly supported by the Retrieved Context.

<Retrieved Context>
{context_text[:8000]}
</Retrieved Context>

<User Query>
{query}
</User Query>

<Generated Answer>
{answer[:4000]}
</Generated Answer>

Task:
Determine what proportion of factual claims in the Generated Answer are grounded in the Retrieved Context.
- If all statements/claims are supported by the context, score = 1.0.
- If some statements are ungrounded or made up, penalize proportionally.
- If the answer is completely ungrounded hallucination, score = 0.0.

Output JSON only:
{{
  "faithfulness_score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation without double quotes>"
}}
"""
        return await self._call_gemini_score(prompt, "faithfulness_score")

    async def judge_answer_relevancy(
        self,
        query: str,
        answer: str,
        should_abstain: bool = False,
    ) -> tuple[float | None, dict[str, Any]]:
        """Evaluate Answer Relevancy (how well the answer addresses the query).
        
        Returns (score, details). If judge call fails, score is None (not 0.0).
        """
        abstention_phrases = [
            "insufficient evidence",
            "not contain enough evidence",
            "cannot answer",
            "do not have enough information",
            "material does not contain",
            "unable to answer",
            "evidence sufficiency notice",
        ]
        has_abstained = any(p in answer.lower() for p in abstention_phrases)

        if should_abstain and has_abstained:
            return 1.0, {"reasoning": "Directly and correctly informed the user that evidence is insufficient"}

        prompt = f"""You are an expert RAG evaluator measuring Answer Relevancy.
Evaluate how well, directly, and completely the Generated Answer addresses the User Query.

<User Query>
{query}
</User Query>

<Generated Answer>
{answer[:4000]}
</Generated Answer>

Task:
Determine how directly the answer addresses the user query:
- If it directly, informatively, and accurately answers the question, score = 1.0.
- If it partially addresses the query or includes irrelevant digressions, score = 0.5 to 0.8.
- If it fails to answer, is evasive, or is off-topic, score = 0.0 to 0.3.

Output JSON only:
{{
  "relevancy_score": <float between 0.0 and 1.0>,
  "reasoning": "<concise explanation without double quotes>"
}}
"""
        return await self._call_gemini_score(prompt, "relevancy_score")
