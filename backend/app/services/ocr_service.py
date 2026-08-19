"""OCR orchestration service for processing documents, PDFs, and image collections."""

import io
import time
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
from .text_service import text_service

logger = logging.getLogger(__name__)


class OCRService:
    """Orchestrates document OCR across images, PDFs, and batch files."""

    def __init__(self, hf_service: Optional[HuggingFaceOCRService] = None):
        self.hf = hf_service or hf_ocr_service

    async def scan_single_image(
        self,
        image_bytes: bytes,
        model_id: Optional[str] = None,
        custom_api_key: Optional[str] = None,
    ) -> OCRPageResult:
        """Scan a single image using Hugging Face OCR."""
        return await self.hf.scan_image_bytes(
            image_bytes=image_bytes,
            model_id=model_id,
            custom_api_key=custom_api_key,
            page_number=1,
        )

    async def scan_batch_images(
        self,
        image_bytes_list: List[bytes],
        model_id: Optional[str] = None,
        custom_api_key: Optional[str] = None,
        max_concurrency: int = 4,
    ) -> OCRBatchResponse:
        """Scan multiple images in parallel."""
        start_time = time.perf_counter()
        results = await self.hf.scan_batch(
            images=image_bytes_list,
            model_id=model_id,
            custom_api_key=custom_api_key,
            max_concurrency=max_concurrency,
        )
        total_latency = round((time.perf_counter() - start_time) * 1000, 2)
        model_used = model_id or self.hf.default_model

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
    ) -> OCRDocumentResponse:
        """
        Extract readable text from a PDF document.
        Uses native text extraction first, and triggers Hugging Face OCR for scanned/image pages.
        """
        start_time = time.perf_counter()
        active_model = model_id or self.hf.default_model

        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        total_pages = min(len(reader.pages), settings.max_pdf_pages_ocr)
        pages_to_process: List[Tuple[int, Optional[str], Optional[bytes]]] = []

        # Analyze pages for native text vs scanned image
        for idx in range(total_pages):
            page = reader.pages[idx]
            page_num = idx + 1
            native_text = ""
            if not force_ocr:
                try:
                    native_text = (page.extract_text() or "").strip()
                except Exception:
                    native_text = ""

            # Check if page has sufficient native selectable text (> 15 words)
            word_count = text_service.count_words(native_text)
            if word_count >= 15 and not force_ocr:
                pages_to_process.append((page_num, native_text, None))
            else:
                # Extract image for OCR
                img_data = None
                if page.images:
                    img_data = page.images[0].data
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
