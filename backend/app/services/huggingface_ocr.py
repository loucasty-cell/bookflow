import io
import time
import asyncio
import hashlib
import logging
from collections import OrderedDict
from typing import List, Optional, Dict, Any, Union

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None  # type: ignore
    ImageOps = None  # type: ignore

from ..core.config import settings
from ..models.ocr import OCRPageResult, HFModelInfo
from .text_service import text_service

logger = logging.getLogger(__name__)


class HuggingFaceOCRService:
    """Client and processor for Hugging Face Vision/OCR image-to-text models."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        max_cache_size: int = 1000,
    ):
        self.api_key = api_key or settings.hf_api_key
        self.default_model = (settings.ocr_model if default_model is None else default_model).strip()
        self.timeout = timeout if timeout is not None else settings.hf_api_timeout
        self.max_retries = max_retries if max_retries is not None else settings.hf_max_retries
        self.base_url_template = settings.hf_inference_url_template
        self._cache: OrderedDict[str, str] = OrderedDict()
        self._max_cache_size = max_cache_size

    def get_headers(self, custom_api_key: Optional[str] = None) -> Dict[str, str]:
        """Build HTTP headers for Hugging Face Inference API."""
        key = custom_api_key or self.api_key
        headers = {
            "Accept": "application/json",
            "User-Agent": "Bookflow-OCR-Client/1.0",
        }
        if key and key.strip():
            headers["Authorization"] = f"Bearer {key.strip()}"
        return headers

    def preprocess_image(self, image_bytes: bytes, max_dimension: int = 2048) -> bytes:
        """
        Preprocess image to ensure standard RGB format, correct EXIF orientation,
        and optimal resolution for Hugging Face vision models.
        """
        if Image is None or ImageOps is None:
            return image_bytes

        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                # Correct orientation from EXIF
                img = ImageOps.exif_transpose(img)

                # Convert mode to RGB
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")

                # Resize if larger than max_dimension to preserve network bandwidth and speed up OCR
                width, height = img.size
                if max(width, height) > max_dimension:
                    scale = max_dimension / max(width, height)
                    new_size = (int(width * scale), int(height * scale))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)

                # Save to optimized JPEG bytes
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=90, optimize=True)
                return output.getvalue()
        except Exception as e:
            logger.warning(f"Image preprocessing warning: {e}. Using raw bytes.")
            return image_bytes

    def parse_hf_response(self, response_data: Any) -> str:
        """Extract plain text string from diverse Hugging Face model response structures."""
        if isinstance(response_data, list):
            if len(response_data) == 0:
                return ""
            item = response_data[0]
            if isinstance(item, dict):
                return (
                    item.get("generated_text")
                    or item.get("text")
                    or item.get("caption")
                    or str(item)
                )
            return str(item)
        elif isinstance(response_data, dict):
            if "error" in response_data:
                raise ValueError(f"Hugging Face API error: {response_data.get('error')}")
            return (
                response_data.get("generated_text")
                or response_data.get("text")
                or response_data.get("caption")
                or str(response_data)
            )
        elif isinstance(response_data, str):
            return response_data
        return str(response_data)

    async def scan_image_bytes(
        self,
        image_bytes: bytes,
        model_id: Optional[str] = None,
        custom_api_key: Optional[str] = None,
        page_number: int = 1,
    ) -> OCRPageResult:
        """
        Send an image to Hugging Face Inference API for OCR text extraction.
        """
        active_model = (model_id or self.default_model).strip()
        start_time = time.perf_counter()

        if not active_model.strip():
            return OCRPageResult(
                page_number=page_number,
                text="",
                paragraphs=[],
                model_used="",
                latency_ms=0.0,
                success=False,
                error=(
                    "No remote OCR model is configured. Set OCR_MODEL in backend/.env "
                    "to a Hugging Face serverless image-to-text model."
                ),
            )

        processed_bytes = self.preprocess_image(image_bytes)
        img_hash = hashlib.sha256(processed_bytes).hexdigest()
        cache_key = f"{active_model}:{img_hash}"

        # Check in-memory SHA-256 LRU cache
        if cache_key in self._cache:
            cached_text = self._cache[cache_key]
            self._cache.move_to_end(cache_key)
            paragraphs = text_service.extract_paragraphs(cached_text)
            return OCRPageResult(
                page_number=page_number,
                text=cached_text,
                paragraphs=paragraphs,
                model_used=f"{active_model} (cached)",
                latency_ms=0.0,
                success=True,
                error=None,
            )

        if httpx is None:
            return OCRPageResult(
                page_number=page_number,
                text="",
                paragraphs=[],
                model_used=active_model,
                latency_ms=0.0,
                success=False,
                error="httpx library is not installed. Please install with: pip install httpx",
            )

        url = self.base_url_template.format(model_id=active_model)
        headers = self.get_headers(custom_api_key)

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        content=processed_bytes,
                    )

                if response.status_code == 200:
                    raw_result = response.json()
                    extracted_text = self.parse_hf_response(raw_result).strip()
                    paragraphs = text_service.extract_paragraphs(extracted_text)
                    latency = round((time.perf_counter() - start_time) * 1000, 2)

                    # Store in LRU cache
                    self._cache[cache_key] = extracted_text
                    if len(self._cache) > self._max_cache_size:
                        self._cache.popitem(last=False)

                    return OCRPageResult(
                        page_number=page_number,
                        text=extracted_text,
                        paragraphs=paragraphs,
                        model_used=active_model,
                        latency_ms=latency,
                        success=True,
                        error=None,
                    )

                # Handle 503 (model loading on Hugging Face)
                if response.status_code == 503:
                    try:
                        info = response.json()
                        estimated_wait = min(info.get("estimated_time", 2.0), 10.0)
                    except Exception:
                        estimated_wait = 2.0
                    logger.info(
                        f"Model {active_model} is loading. Waiting {estimated_wait}s (attempt {attempt}/{self.max_retries})."
                    )
                    await asyncio.sleep(estimated_wait)
                    continue

                if response.status_code == 401:
                    raise ValueError(
                        "Hugging Face API returned 401 Unauthorized. Please provide a valid HF_API_KEY."
                    )

                if response.status_code == 429:
                    raise ValueError(
                        "Hugging Face API rate limit reached (HTTP 429). Please retry shortly."
                    )

                if response.status_code in (400, 403, 404):
                    try:
                        detail = response.json().get("error") or response.text
                    except Exception:
                        detail = response.text
                    raise ValueError(
                        f"Hugging Face does not provide {active_model} through this endpoint: {detail}"
                    )

                response.raise_for_status()

            except Exception as exc:
                last_error = str(exc)
                logger.warning(
                    f"Attempt {attempt}/{self.max_retries} failed for model {active_model}: {exc}"
                )
                if any(code in last_error for code in ("400", "401", "403", "404")):
                    break
                if attempt < self.max_retries:
                    await asyncio.sleep(1.0 * attempt)

        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return OCRPageResult(
            page_number=page_number,
            text="",
            paragraphs=[],
            model_used=active_model,
            latency_ms=latency,
            success=False,
            error=last_error or "Unknown OCR failure",
        )

    async def scan_batch(
        self,
        images: List[bytes],
        model_id: Optional[str] = None,
        custom_api_key: Optional[str] = None,
        max_concurrency: int = 4,
    ) -> List[OCRPageResult]:
        """
        Process multiple image bytes concurrently with a bounded semaphore.
        """
        semaphore = asyncio.Semaphore(max_concurrency)

        async def _bounded_scan(idx: int, img_bytes: bytes) -> OCRPageResult:
            async with semaphore:
                return await self.scan_image_bytes(
                    image_bytes=img_bytes,
                    model_id=model_id,
                    custom_api_key=custom_api_key,
                    page_number=idx + 1,
                )

        tasks = [_bounded_scan(i, img) for i, img in enumerate(images)]
        results = await asyncio.gather(*tasks)
        return list(results)

    def get_available_models(self) -> List[HFModelInfo]:
        """Return the single model configured for this backend, when present."""
        if not self.default_model:
            return []
        return [
            HFModelInfo(
                id=self.default_model,
                name=self.default_model,
                description="Configured Hugging Face serverless image-to-text model.",
                recommended_for="Use a model whose Inference Provider mapping supports image-to-text requests.",
            )
        ]


hf_ocr_service = HuggingFaceOCRService()


def get_hf_ocr_service() -> HuggingFaceOCRService:
    """Dependency provider for FastAPI dependency injection."""
    return hf_ocr_service
