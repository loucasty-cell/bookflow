"""Pydantic data models for Bookflow Backend."""

from .document import (
    NormalizedBook,
    Chapter,
    Paragraph,
    Section,
    ParseResponse,
    DocumentValidationResponse,
)
from .ocr import (
    OCRPageResult,
    OCRDocumentResponse,
    OCRBatchResponse,
    HFModelInfo,
    OCRModelListResponse,
)
from .reader import (
    Note,
    Bookmark,
    ReadingProgress,
    SegmentRequest,
    SegmentResponse,
    ReadingTimeRequest,
    ReadingTimeResponse,
    ExportPayload,
)

__all__ = [
    "NormalizedBook",
    "Chapter",
    "Paragraph",
    "Section",
    "ParseResponse",
    "DocumentValidationResponse",
    "OCRPageResult",
    "OCRDocumentResponse",
    "OCRBatchResponse",
    "HFModelInfo",
    "OCRModelListResponse",
    "Note",
    "Bookmark",
    "ReadingProgress",
    "SegmentRequest",
    "SegmentResponse",
    "ReadingTimeRequest",
    "ReadingTimeResponse",
    "ExportPayload",
]
