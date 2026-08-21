"""Bookflow FastAPI Application Entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .routers import health_router, ocr_router, documents_router, reader_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version} ({settings.environment})")
    yield
    logger.info(f"Shutting down {settings.app_name}")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="High-performance backend for Bookflow: document parsing, sentence analytics, and fast Hugging Face Vision OCR scanning.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        settings.cors_origins
        if isinstance(settings.cors_origins, list)
        else [settings.cors_origins]
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to format all unhandled errors as JSON."""
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal Server Error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred during request processing.",
            "path": request.url.path,
        },
    )


# Include API routers
app.include_router(health_router)
app.include_router(ocr_router)
app.include_router(documents_router)
app.include_router(reader_router)


@app.get("/")
async def root():
    """Root endpoint providing quick API status and link to docs."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health",
    }
