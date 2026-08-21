"""Health and application information endpoints."""

import time
from fastapi import APIRouter
from ..core.config import settings

router = APIRouter(prefix="/api", tags=["Health & System"])


@router.get("/health")
async def get_health():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": int(time.time()),
    }


@router.get("/info")
async def get_info():
    """Service capabilities and configuration summary."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "supported_formats": [".pdf", ".epub", ".txt", ".md", ".markdown"],
        "max_upload_size_mb": settings.max_upload_size_mb,
        "hf_ocr": {
            "default_model": settings.ocr_model,
            "token_configured": bool(settings.hf_api_key and settings.hf_api_key.strip()),
            "available_models_count": 1 if settings.ocr_model else 0,
        },
    }
