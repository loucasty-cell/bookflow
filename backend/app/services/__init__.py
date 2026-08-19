"""Service layer for document processing, OCR scanning, and text analytics."""

from .huggingface_ocr import HuggingFaceOCRService, hf_ocr_service
from .ocr_service import OCRService, ocr_service
from .document_service import DocumentService, document_service
from .text_service import TextService, text_service

__all__ = [
    "HuggingFaceOCRService",
    "hf_ocr_service",
    "OCRService",
    "ocr_service",
    "DocumentService",
    "document_service",
    "TextService",
    "text_service",
]
