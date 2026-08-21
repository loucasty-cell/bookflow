"""Health and application information endpoints."""

import time
from fastapi import APIRouter, Depends
from ..core.config import Settings, get_settings

router = APIRouter(prefix="/api", tags=["Health & System"])


@router.get("/health")
async def get_health(cfg: Settings = Depends(get_settings)):
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "app": cfg.app_name,
        "version": cfg.app_version,
        "environment": cfg.environment,
        "timestamp": int(time.time()),
    }


@router.get("/info")
async def get_info(cfg: Settings = Depends(get_settings)):
    """Service capabilities and configuration summary."""
    return {
        "app": cfg.app_name,
        "version": cfg.app_version,
        "supported_formats": [".pdf", ".epub", ".txt", ".md", ".markdown"],
        "max_upload_size_mb": cfg.max_upload_size_mb,
        "hf_ocr": {
            "default_model": cfg.ocr_model,
            "token_configured": bool(cfg.hf_api_key and cfg.hf_api_key.strip()),
            "available_models_count": 1 if cfg.ocr_model else 0,
            "paddleocr_configured": bool(cfg.paddleocr_url),
        },
    }
