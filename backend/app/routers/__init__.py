"""FastAPI API routers for Bookflow."""

from .health import router as health_router
from .ocr import router as ocr_router
from .documents import router as documents_router
from .reader import router as reader_router

__all__ = ["health_router", "ocr_router", "documents_router", "reader_router"]
