"""Hugging Face Image-to-Text OCR Endpoints with Dependency Injection."""

import json
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Header, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from ..core.config import settings
from ..services.ocr_service import OCRService, get_ocr_service
from ..services.huggingface_ocr import HuggingFaceOCRService, get_hf_ocr_service
from ..models.ocr import (
    OCRPageResult,
    OCRDocumentResponse,
    OCRBatchResponse,
    OCRModelListResponse,
)

router = APIRouter(prefix="/api/ocr", tags=["OCR & Vision"])


@router.get("/models", response_model=OCRModelListResponse)
async def list_ocr_models(
    hf_service: HuggingFaceOCRService = Depends(get_hf_ocr_service),
):
    """List recommended Hugging Face Image-to-Text OCR models and default configuration."""
    return OCRModelListResponse(
        default_model=settings.hf_ocr_model,
        hf_token_configured=bool(settings.hf_api_key and settings.hf_api_key.strip()),
        available_models=hf_service.get_available_models(),
    )


@router.post("/image", response_model=OCRPageResult)
async def ocr_single_image(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP, TIFF, BMP)"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token for HF API"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
    ocr_srv: OCRService = Depends(get_ocr_service),
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

    result = await ocr_srv.scan_single_image(
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
    ocr_srv: OCRService = Depends(get_ocr_service),
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

    result = await ocr_srv.scan_batch_images(
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
    ocr_srv: OCRService = Depends(get_ocr_service),
):
    """
    Extract text from a PDF document, using native extraction for text pages
    and Hugging Face OCR scanning for scanned/image pages.
    """
    filename = file.filename or "scanned_document.pdf"
    if not filename.lower().endswith(".pdf"):
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

    result = await ocr_srv.scan_pdf_document(
        pdf_bytes=pdf_bytes,
        model_id=model_id,
        custom_api_key=token,
        force_ocr=force_ocr,
        title=filename.replace(".pdf", "").replace("_", " ").title(),
    )
    return result


@router.post("/stream/pdf")
async def stream_pdf_ocr(
    file: UploadFile = File(..., description="PDF document file"),
    force_ocr: bool = Form(False, description="Force OCR on all pages"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
    ocr_srv: OCRService = Depends(get_ocr_service),
):
    """
    Stream OCR page results progressively via Server-Sent Events (SSE)
    for immediate first-page rendering.
    """
    filename = file.filename or "scanned_document.pdf"
    if not filename.lower().endswith(".pdf"):
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

    async def event_generator():
        yield f"event: start\ndata: {json.dumps({'status': 'processing', 'filename': filename})}\n\n"
        try:
            doc_res = await ocr_srv.scan_pdf_document(
                pdf_bytes=pdf_bytes,
                model_id=model_id,
                custom_api_key=token,
                force_ocr=force_ocr,
                title=filename.replace(".pdf", "").replace("_", " ").title(),
            )
            for page in doc_res.pages:
                payload = {
                    "page_number": page.page_number,
                    "text": page.text,
                    "paragraphs": page.paragraphs,
                    "model_used": page.model_used,
                    "success": page.success,
                }
                yield f"event: page\ndata: {json.dumps(payload)}\n\n"

            yield f"event: completed\ndata: {json.dumps({'total_pages': doc_res.total_pages, 'total_words': doc_res.total_word_count})}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
