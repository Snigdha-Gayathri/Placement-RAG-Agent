"""Gemini-only model client used by the backend service."""

from __future__ import annotations

import os

import httpx


class GeminiClient:
    """Minimal Gemini API client for generateContent requests."""

    def __init__(self) -> None:
        self._api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
        self._model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    async def generate(self, system_prompt: str, user_prompt: str, max_output_tokens: int) -> str:
        if not self._api_key:
            raise RuntimeError("Gemini API key is not configured")

        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent"
            f"?key={self._api_key}"
        )

        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"maxOutputTokens": max_output_tokens},
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()

        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "\n".join(part.get("text", "") for part in parts if part.get("text"))
        return text or "I encountered an issue processing your request."

    async def health_check(self) -> bool:
        try:
            await self.generate("Respond with OK.", "OK", 8)
            return True
        except Exception:
            return False
