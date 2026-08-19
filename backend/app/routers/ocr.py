"""Hugging Face Image-to-Text OCR Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Header, Query, HTTPException, status
from ..services.ocr_service import ocr_service
from ..services.huggingface_ocr import hf_ocr_service
from ..models.ocr import (
    OCRPageResult,
    OCRDocumentResponse,
    OCRBatchResponse,
    OCRModelListResponse,
)
from ..core.config import settings

router = APIRouter(prefix="/api/ocr", tags=["OCR & Vision"])


@router.get("/models", response_model=OCRModelListResponse)
async def list_ocr_models():
    """List recommended Hugging Face Image-to-Text OCR models and default configuration."""
    return OCRModelListResponse(
        defaultModel=settings.hf_ocr_model,
        hfTokenConfigured=bool(settings.hf_api_key and settings.hf_api_key.strip()),
        availableModels=hf_ocr_service.get_available_models(),
    )


@router.post("/image", response_model=OCRPageResult)
async def ocr_single_image(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP, TIFF, BMP)"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token for HF API"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
):
    """
    Perform fast OCR text extraction on a single image using Hugging Face Vision models.
    """
    token = x_hf_token or (authorization.replace("Bearer ", "") if authorization else None)
    
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty",
        )

    result = await ocr_service.scan_single_image(
        image_bytes=contents,
        model_id=model_id,
        custom_api_key=token,
    )
    return result


@router.post("/batch", response_model=OCRBatchResponse)
async def ocr_batch_images(
    files: List[UploadFile] = File(..., description="Multiple image files"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token for HF API"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
):
    """
    Perform batch OCR text extraction concurrently across multiple image files.
    """
    if len(files) > settings.max_batch_images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size exceeds maximum limit of {settings.max_batch_images} images",
        )

    token = x_hf_token or (authorization.replace("Bearer ", "") if authorization else None)
    image_bytes_list: List[bytes] = []

    for f in files:
        data = await f.read()
        if data:
            image_bytes_list.append(data)

    if not image_bytes_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid image files provided in batch request",
        )

    result = await ocr_service.scan_batch_images(
        image_bytes_list=image_bytes_list,
        model_id=model_id,
        custom_api_key=token,
    )
    return result


@router.post("/pdf", response_model=OCRDocumentResponse)
async def ocr_pdf_document(
    file: UploadFile = File(..., description="PDF document file"),
    force_ocr: bool = Form(False, description="Force Hugging Face OCR even if native text is present"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token for HF API"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
):
    """
    Extract text from a PDF document, using native extraction for text pages
    and Hugging Face OCR scanning for scanned/image pages.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .pdf document",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty",
        )

    token = x_hf_token or (authorization.replace("Bearer ", "") if authorization else None)

    result = await ocr_service.scan_pdf_document(
        pdf_bytes=pdf_bytes,
        model_id=model_id,
        custom_api_key=token,
        force_ocr=force_ocr,
        title=file.filename.replace(".pdf", "").replace("_", " ").title(),
    )
    return result
