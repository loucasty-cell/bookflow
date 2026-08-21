"""Service layer for document processing, OCR scanning, and text analytics."""

from .huggingface_ocr import HuggingFaceOCRService, hf_ocr_service
from .paddle_ocr import PaddleOCRClient, paddle_ocr_client
from .ocr_service import OCRService, ocr_service
from .document_service import DocumentService, document_service
from .text_service import TextService, text_service

__all__ = [
    "HuggingFaceOCRService",
    "hf_ocr_service",
    "PaddleOCRClient",
    "paddle_ocr_client",
    "OCRService",
    "ocr_service",
    "DocumentService",
    "document_service",
    "TextService",
    "text_service",
]
