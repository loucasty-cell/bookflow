"""PaddleOCR-first vision OCR endpoints with Hugging Face fallback."""

import json
import re
from typing import List, Optional
from urllib.parse import urlparse
from fastapi import APIRouter, UploadFile, File, Form, Header, Depends, HTTPException, status, Response
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

MAX_UPLOAD_BYTES = settings.max_upload_size_mb * 1024 * 1024
MAX_BATCH_BYTES = MAX_UPLOAD_BYTES
ALLOWED_IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp")
ALLOWED_IMAGE_MIME_PREFIX = "image/"
MODEL_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*(?:/[A-Za-z0-9][A-Za-z0-9._-]*)?$")
ALLOWED_HF_HOSTS = frozenset({"router.huggingface.co", "huggingface.co"})
HF_ENDPOINT_SUFFIX = ".endpoints.huggingface.cloud"
NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


def _set_no_store(response: Response) -> None:
    response.headers.update(NO_STORE_HEADERS)


def _bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, separator, value = authorization.strip().partition(" ")
    if not separator or scheme.lower() != "bearer":
        return None
    token = value.strip()
    return token or None


def _validate_model_id(model_id: Optional[str]) -> str:
    value = (model_id or "").strip()
    if not value:
        return value
    if len(value) > 200 or not MODEL_ID_PATTERN.fullmatch(value):
        raise ValueError("OCR model ID contains unsupported characters.")
    if any(segment in {".", ".."} for segment in value.split("/")):
        raise ValueError("OCR model ID contains an unsafe path segment.")
    return value


def _validate_hf_inference_url(value: Optional[str]) -> str:
    normalized = (value or "").strip()
    if not normalized:
        return normalized
    try:
        parsed = urlparse(normalized)
        port = parsed.port
    except ValueError as exc:
        raise ValueError("HF_INFERENCE_URL is not a valid URL.") from exc
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme.lower() != "https":
        raise ValueError("HF_INFERENCE_URL must use HTTPS.")
    if not hostname or (
        hostname not in ALLOWED_HF_HOSTS and not hostname.endswith(HF_ENDPOINT_SUFFIX)
    ):
        raise ValueError("HF_INFERENCE_URL host is not allowed.")
    if port is not None and port != 443:
        raise ValueError("HF_INFERENCE_URL must use the HTTPS default port.")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("HF_INFERENCE_URL must not contain credentials.")
    if parsed.query or parsed.fragment:
        raise ValueError("HF_INFERENCE_URL must not contain a query or fragment.")
    if normalized.count("{model_id}") > 1 or any(
        marker in normalized.replace("{model_id}", "") for marker in ("{", "}")
    ):
        raise ValueError("HF_INFERENCE_URL contains an invalid model placeholder.")
    return normalized.rstrip("/")


def _request_model(model_id: Optional[str]) -> str:
    try:
        _validate_hf_inference_url(settings.hf_inference_url_template)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OCR inference endpoint configuration is invalid.",
        ) from exc
    try:
        return _validate_model_id(model_id or settings.ocr_model)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


def _reject_oversize(size_bytes: int, label: str) -> None:
    if size_bytes > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{label} exceeds maximum size of {settings.max_upload_size_mb} MB",
        )


def _validate_image_upload(file: UploadFile) -> None:
    filename = (file.filename or "").lower()
    if not filename.endswith(ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image (PNG, JPG, WEBP, TIFF, BMP)",
        )
    content_type = (file.content_type or "").lower()
    if content_type and not content_type.startswith(ALLOWED_IMAGE_MIME_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image (PNG, JPG, WEBP, TIFF, BMP)",
        )
    declared_size = getattr(file, "size", None)
    if declared_size is not None:
        _reject_oversize(declared_size, "Uploaded image")


def _validate_pdf_upload(file: UploadFile) -> str:
    filename = file.filename or "scanned_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .pdf document",
        )
    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a .pdf document",
        )
    declared_size = getattr(file, "size", None)
    if declared_size is not None:
        _reject_oversize(declared_size, "Uploaded PDF")
    return filename


@router.get("/models", response_model=OCRModelListResponse)
async def list_ocr_models(
    response: Response,
    hf_service: HuggingFaceOCRService = Depends(get_hf_ocr_service),
):
    """List the configured Hugging Face image-text-to-text model."""
    _set_no_store(response)
    return OCRModelListResponse(
        default_model=settings.ocr_model,
        hf_token_configured=bool(settings.hf_api_key and settings.hf_api_key.strip()),
        available_models=hf_service.get_available_models(),
    )


@router.post("/image", response_model=OCRPageResult)
async def ocr_single_image(
    response: Response,
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP, TIFF, BMP)"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    ocr_profile: str = Form("small", description="PaddleOCR profile: small or medium"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token for HF API"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
    ocr_srv: OCRService = Depends(get_ocr_service),
):
    """
    Perform fast OCR text extraction on a single image using Hugging Face Vision models.
    """
    _set_no_store(response)
    active_model = _request_model(model_id)
    token = x_hf_token or _bearer_token(authorization)

    _validate_image_upload(file)
    contents = await file.read()
    _reject_oversize(len(contents), "Uploaded image")
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty",
        )

    result = await ocr_srv.scan_single_image(
        image_bytes=contents,
        model_id=active_model,
        custom_api_key=token,
        ocr_profile=ocr_profile,
    )
    return result


@router.post("/batch", response_model=OCRBatchResponse)
async def ocr_batch_images(
    response: Response,
    files: List[UploadFile] = File(..., description="Multiple image files"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    ocr_profile: str = Form("small", description="PaddleOCR profile: small or medium"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token for HF API"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
    ocr_srv: OCRService = Depends(get_ocr_service),
):
    """
    Perform batch OCR text extraction concurrently across multiple image files.
    """
    _set_no_store(response)
    active_model = _request_model(model_id)
    if len(files) > settings.max_batch_images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size exceeds maximum limit of {settings.max_batch_images} images",
        )

    token = x_hf_token or _bearer_token(authorization)
    image_bytes_list: List[bytes] = []
    total_bytes = 0

    for f in files:
        _validate_image_upload(f)
        data = await f.read()
        if data:
            _reject_oversize(len(data), "Uploaded image")
            total_bytes += len(data)
            if total_bytes > MAX_BATCH_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Batch exceeds maximum size of {settings.max_upload_size_mb} MB",
                )
            image_bytes_list.append(data)

    if not image_bytes_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid image files provided in batch request",
        )

    result = await ocr_srv.scan_batch_images(
        image_bytes_list=image_bytes_list,
        model_id=active_model,
        custom_api_key=token,
        ocr_profile=ocr_profile,
    )
    return result


@router.post("/pdf", response_model=OCRDocumentResponse)
async def ocr_pdf_document(
    response: Response,
    file: UploadFile = File(..., description="PDF document file"),
    force_ocr: bool = Form(False, description="Force PaddleOCR/Hugging Face OCR even if native text is present"),
    model_id: Optional[str] = Form(None, description="Hugging Face fallback model ID"),
    ocr_profile: str = Form("small", description="PaddleOCR profile: small or medium"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token for HF API"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
    ocr_srv: OCRService = Depends(get_ocr_service),
):
    """
    Extract text from a PDF document, using native extraction for text pages
    and PaddleOCR-first scanning with Hugging Face fallback for scanned/image pages.
    """
    _set_no_store(response)
    active_model = _request_model(model_id)
    filename = _validate_pdf_upload(file)

    pdf_bytes = await file.read()
    _reject_oversize(len(pdf_bytes), "Uploaded PDF")
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty",
        )

    token = x_hf_token or _bearer_token(authorization)

    result = await ocr_srv.scan_pdf_document(
        pdf_bytes=pdf_bytes,
        model_id=active_model,
        custom_api_key=token,
        force_ocr=force_ocr,
        title=filename.replace(".pdf", "").replace("_", " ").title(),
        ocr_profile=ocr_profile,
    )
    return result


@router.post("/stream/pdf")
async def stream_pdf_ocr(
    response: Response,
    file: UploadFile = File(..., description="PDF document file"),
    force_ocr: bool = Form(False, description="Force OCR on all pages"),
    model_id: Optional[str] = Form(None, description="Hugging Face model ID"),
    ocr_profile: str = Form("small", description="PaddleOCR profile: small or medium"),
    authorization: Optional[str] = Header(None, description="Optional Bearer token"),
    x_hf_token: Optional[str] = Header(None, description="Optional Hugging Face token"),
    ocr_srv: OCRService = Depends(get_ocr_service),
):
    """
    Stream OCR page results progressively via Server-Sent Events (SSE)
    for immediate first-page rendering.
    """
    _set_no_store(response)
    active_model = _request_model(model_id)
    filename = _validate_pdf_upload(file)

    pdf_bytes = await file.read()
    _reject_oversize(len(pdf_bytes), "Uploaded PDF")
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty",
        )

    token = x_hf_token or _bearer_token(authorization)

    async def event_generator():
        yield f"event: start\ndata: {json.dumps({'status': 'processing', 'filename': filename})}\n\n"
        try:
            doc_res = await ocr_srv.scan_pdf_document(
                pdf_bytes=pdf_bytes,
                model_id=active_model,
                custom_api_key=token,
                force_ocr=force_ocr,
                title=filename.replace(".pdf", "").replace("_", " ").title(),
                ocr_profile=ocr_profile,
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
            **NO_STORE_HEADERS,
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
