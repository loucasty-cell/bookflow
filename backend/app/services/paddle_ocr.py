import base64
import time
from typing import Any, Dict, Optional

import httpx

from ..core.config import settings
from ..models.ocr import OCRPageResult
from .text_service import text_service


class PaddleOCRClient:
    """HTTP adapter for an optional PaddleOCR service managed by the backend operator."""

    def __init__(self, url: Optional[str] = None, timeout: Optional[float] = None):
        self.url = (settings.paddleocr_url if url is None else url).strip().rstrip("/")
        self.timeout = timeout if timeout is not None else settings.paddleocr_timeout

    @property
    def enabled(self) -> bool:
        return bool(self.url)

    @staticmethod
    def parse_response(response_data: Any) -> str:
        if isinstance(response_data, str):
            return response_data.strip()
        if isinstance(response_data, dict):
            for key in ("markdown", "text", "prunedResult", "markdownText", "result", "ocrResults"):
                if key in response_data:
                    value = PaddleOCRClient.parse_response(response_data[key])
                    if value:
                        return value
            return ""
        if isinstance(response_data, list):
            parts = [PaddleOCRClient.parse_response(item) for item in response_data]
            return "\n".join(part for part in parts if part).strip()
        return ""

    async def scan_image_bytes(self, image_bytes: bytes, page_number: int = 1) -> Optional[OCRPageResult]:
        if not self.enabled:
            return None

        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.url,
                    headers={"Accept": "application/json", "Content-Type": "application/json"},
                    json={"file": base64.b64encode(image_bytes).decode("ascii"), "fileType": 1},
                )
            if response.status_code != 200:
                return OCRPageResult(
                    page_number=page_number,
                    text="",
                    paragraphs=[],
                    model_used="paddleocr",
                    latency_ms=round((time.perf_counter() - started) * 1000, 2),
                    success=False,
                    error=f"PaddleOCR service returned HTTP {response.status_code}: {response.text[:200]}",
                )

            text = self.parse_response(response.json())
            if not text:
                return OCRPageResult(
                    page_number=page_number,
                    text="",
                    paragraphs=[],
                    model_used="paddleocr",
                    latency_ms=round((time.perf_counter() - started) * 1000, 2),
                    success=False,
                    error="PaddleOCR service returned no text.",
                )

            return OCRPageResult(
                page_number=page_number,
                text=text,
                paragraphs=text_service.extract_paragraphs(text),
                model_used="paddleocr",
                latency_ms=round((time.perf_counter() - started) * 1000, 2),
                success=True,
                error=None,
            )
        except Exception as exc:
            return OCRPageResult(
                page_number=page_number,
                text="",
                paragraphs=[],
                model_used="paddleocr",
                latency_ms=round((time.perf_counter() - started) * 1000, 2),
                success=False,
                error=f"PaddleOCR service request failed: {exc}",
            )


paddle_ocr_client = PaddleOCRClient()


def get_paddle_ocr_client() -> PaddleOCRClient:
    return paddle_ocr_client
