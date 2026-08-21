"""OCR orchestration service for processing documents, PDFs, and image collections."""

import io
import time
import asyncio
import logging
from typing import List, Optional, Dict, Any, Tuple
import pypdf
from PIL import Image

from ..models.ocr import (
    OCRPageResult,
    OCRDocumentResponse,
    OCRBatchResponse,
)
from ..core.config import settings
from .huggingface_ocr import HuggingFaceOCRService, hf_ocr_service
from .paddle_ocr import PaddleOCRClient, paddle_ocr_client
from .text_service import text_service

logger = logging.getLogger(__name__)


class OCRService:
    """Orchestrates document OCR across images, PDFs, and batch files."""

    def __init__(
        self,
        hf_service: Optional[HuggingFaceOCRService] = None,
        paddle_service: Optional[PaddleOCRClient] = None,
    ):
        self.hf = hf_service or hf_ocr_service
        self.paddle = paddle_service or paddle_ocr_client

    async def scan_single_image(
        self,
        image_bytes: bytes,
        model_id: Optional[str] = None,
        custom_api_key: Optional[str] = None,
        page_number: int = 1,
        ocr_profile: str = "small",
    ) -> OCRPageResult:
        """Scan a single image using PaddleOCR first, then Hugging Face OCR."""
        paddle_result = await self.paddle.scan_image_bytes(
            image_bytes,
            page_number=page_number,
            profile=ocr_profile,
        )
        if paddle_result and paddle_result.success:
            return paddle_result
        return await self.hf.scan_image_bytes(
            image_bytes=image_bytes,
            model_id=model_id,
            custom_api_key=custom_api_key,
            page_number=page_number,
        )

    async def scan_batch_images(
        self,
        image_bytes_list: List[bytes],
        model_id: Optional[str] = None,
        custom_api_key: Optional[str] = None,
        max_concurrency: int = 4,
        ocr_profile: str = "small",
    ) -> OCRBatchResponse:
        """Scan multiple images in parallel."""
        start_time = time.perf_counter()
        if self.paddle.enabled:
            semaphore = asyncio.Semaphore(max_concurrency)

            async def scan_one(index: int, image_bytes: bytes) -> OCRPageResult:
                async with semaphore:
                    return await self.scan_single_image(
                        image_bytes=image_bytes,
                        model_id=model_id,
                        custom_api_key=custom_api_key,
                        page_number=index + 1,
                        ocr_profile=ocr_profile,
                    )

            results = list(await asyncio.gather(*[
                scan_one(index, image_bytes)
                for index, image_bytes in enumerate(image_bytes_list)
            ]))
        else:
            results = await self.hf.scan_batch(
                images=image_bytes_list,
                model_id=model_id,
                custom_api_key=custom_api_key,
                max_concurrency=max_concurrency,
            )
        total_latency = round((time.perf_counter() - start_time) * 1000, 2)
        successful_models = list(dict.fromkeys(
            result.model_used for result in results if result.success and result.model_used
        ))
        model_used = ", ".join(successful_models) or model_id or self.hf.default_model

        return OCRBatchResponse(
            success=any(r.success for r in results),
            results=results,
            total_images=len(image_bytes_list),
            model_used=model_used,
            total_latency_ms=total_latency,
        )

    def extract_pdf_page_images(self, pdf_bytes: bytes, max_pages: Optional[int] = None) -> List[Tuple[int, bytes]]:
        """
        Extract embedded images or page representations from a PDF using pypdf.
        Returns a list of tuples: (page_number, image_bytes).
        """
        extracted: List[Tuple[int, bytes]] = []
        limit = max_pages or settings.max_pdf_pages_ocr
        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            total_pages = min(len(reader.pages), limit)

            for page_idx in range(total_pages):
                page = reader.pages[page_idx]
                page_images = page.images
                if page_images:
                    # Take the first or largest image on the page
                    first_img = page_images[0]
                    extracted.append((page_idx + 1, first_img.data))
                else:
                    # If no direct image stream, check native text
                    pass
        except Exception as e:
            logger.error(f"Error extracting images from PDF: {e}")

        return extracted

    async def scan_pdf_document(
        self,
        pdf_bytes: bytes,
        model_id: Optional[str] = None,
        custom_api_key: Optional[str] = None,
        force_ocr: bool = False,
        title: Optional[str] = None,
        ocr_profile: str = "small",
    ) -> OCRDocumentResponse:
        """
        Extract readable text from a PDF document.
        Uses native text extraction first, then PaddleOCR and Hugging Face OCR for scanned/image pages.
        """
        start_time = time.perf_counter()
        active_model = model_id or self.hf.default_model

        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        total_pages = min(len(reader.pages), settings.max_pdf_pages_ocr)
        pages_to_process: List[Tuple[int, Optional[str], Optional[bytes]]] = []

        # Analyze pages for native text vs scanned image using PyMuPDF if available
        try:
            import fitz
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_pages = min(len(doc), settings.max_pdf_pages_ocr)
            matrix = fitz.Matrix(96 / 72, 96 / 72)
            for idx in range(total_pages):
                page = doc.load_page(idx)
                page_num = idx + 1
                raw_text = page.get_text("text") if not force_ocr else ""
                native_text = str(raw_text).strip() if raw_text else ""
                word_count = text_service.count_words(native_text)

                if word_count >= 15 and not force_ocr:
                    pages_to_process.append((page_num, native_text, None))
                else:
                    pix = page.get_pixmap(matrix=matrix, alpha=False)
                    img_data = pix.tobytes("jpeg", jpg_quality=85)
                    pages_to_process.append((page_num, None, img_data))
            doc.close()
        except Exception:
            # Fallback to pypdf
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            total_pages = min(len(reader.pages), settings.max_pdf_pages_ocr)
            for idx in range(total_pages):
                page = reader.pages[idx]
                page_num = idx + 1
                native_text = ""
                if not force_ocr:
                    try:
                        native_text = (page.extract_text() or "").strip()
                    except Exception:
                        native_text = ""

                word_count = text_service.count_words(native_text)
                if word_count >= 15 and not force_ocr:
                    pages_to_process.append((page_num, native_text, None))
                else:
                    img_data = page.images[0].data if page.images else None
                    pages_to_process.append((page_num, None, img_data))

        # Perform OCR on image pages
        ocr_results: List[OCRPageResult] = []
        for page_num, native_text, img_data in pages_to_process:
            if native_text is not None:
                paragraphs = text_service.extract_paragraphs(native_text)
                ocr_results.append(
                    OCRPageResult(
                        page_number=page_num,
                        text=native_text,
                        paragraphs=paragraphs,
                        model_used="native-pdf-text",
                        latency_ms=0.0,
                        success=True,
                    )
                )
            elif img_data is not None:
                ocr_res = await self.paddle.scan_image_bytes(
                    img_data,
                    page_number=page_num,
                    profile=ocr_profile,
                )
                if not ocr_res or not ocr_res.success:
                    ocr_res = await self.hf.scan_image_bytes(
                        image_bytes=img_data,
                        model_id=active_model,
                        custom_api_key=custom_api_key,
                        page_number=page_num,
                    )
                ocr_results.append(ocr_res)
            else:
                # Page has neither sufficient text nor extractable images
                ocr_results.append(
                    OCRPageResult(
                        page_number=page_num,
                        text="",
                        paragraphs=[],
                        model_used=active_model,
                        latency_ms=0.0,
                        success=False,
                        error="No readable text or embedded image found on page",
                    )
                )

        total_latency = round((time.perf_counter() - start_time) * 1000, 2)
        successful = sum(1 for r in ocr_results if r.success and r.text)
        failed = len(ocr_results) - successful
        total_words = sum(text_service.count_words(r.text) for r in ocr_results)

        return OCRDocumentResponse(
            success=successful > 0,
            title=title or "Scanned Document",
            pages=ocr_results,
            total_pages=total_pages,
            successful_pages=successful,
            failed_pages=failed,
            total_word_count=total_words,
            total_latency_ms=total_latency,
            model_used=active_model,
            error=None if successful > 0 else "Failed to extract readable text from document",
        )


ocr_service = OCRService()


def get_ocr_service() -> OCRService:
    """Dependency provider for FastAPI dependency injection."""
    return ocr_service
