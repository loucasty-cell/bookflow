import asyncio
import logging
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, File, Form, Header, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from app.services.ocr_jobs import (
    MAX_ACTIVE_JOBS,
    MAX_JOBS,
    MAX_PENDING_JOBS,
    MAX_SUBSCRIBERS_PER_JOB,
    OCRJob,
    PageData,
    SUBSCRIBER_QUEUE_SIZE,
    _pipeline_semaphores,
    get_pipeline_semaphore,
    jobs,
    jobs_lock,
    prune_stale_jobs as prune_stale_jobs_service,
)
from app.services.ocr_pipeline import (
    process_ocr_pipeline as process_ocr_pipeline_service,
    run_ocr_pipeline_job as run_ocr_pipeline_job_service,
)
from app.services.ocr_providers import (
    ALLOWED_HF_HOSTS,
    HF_ENDPOINT_SUFFIX,
    MODEL_ID_PATTERN,
    OCRProviderConfig,
    bearer_token,
    build_hf_chat_payload as build_hf_chat_payload_service,
    call_ocr_with_retry as call_ocr_with_retry_service,
    call_paddleocr as call_paddleocr_service,
    ensure_hf_inference_support as ensure_hf_inference_support_service,
    hf_inference_url_for_model as hf_inference_url_for_model_service,
    parse_hf_chat_response,
    validate_hf_inference_url,
    validate_model_id,
)
from app.services.ocr_rendering import (
    RENDER_DPI,
    RENDER_SCALE,
    count_pdf_pages_sync,
    render_pdf_pages_async as render_pdf_pages_async_service,
    render_pdf_pages_sync as render_pdf_pages_sync_service,
)
from app.services.ocr_sse import (
    NO_STORE_HEADERS,
    build_progress_response,
    offer_subscriber_message,
    progress_events,
    notify_subscribers as notify_subscribers_service,
)

logger = logging.getLogger("bookflow.ocr")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

OCR_MODEL = os.getenv("OCR_MODEL", "Qwen/Qwen2-VL-7B-Instruct").strip()
HF_TOKEN = os.getenv("HF_TOKEN", os.getenv("HF_API_KEY", ""))
HF_INFERENCE_URL = os.getenv(
    "HF_INFERENCE_URL",
    "https://router.huggingface.co/v1/chat/completions",
).rstrip("/")
PADDLEOCR_URL = os.getenv("PADDLEOCR_URL", "").strip().rstrip("/")
HF_MAX_TOKENS = int(os.getenv("HF_MAX_TOKENS", "2048"))
OCR_PROMPT = os.getenv(
    "OCR_PROMPT",
    "Extract all text from this page exactly as written. Return only the extracted text in Markdown, preserving reading order, headings, tables, and line breaks.",
)
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
).split(",")

DEFAULT_BATCH_SIZE = 16
MAX_RETRIES = 3
MAX_UPLOAD_MB = 50
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
THREAD_POOL_WORKERS = min(32, (os.cpu_count() or 4) * 4)
executor = ThreadPoolExecutor(max_workers=THREAD_POOL_WORKERS)


def _provider_config() -> OCRProviderConfig:
    return OCRProviderConfig(
        inference_url=HF_INFERENCE_URL,
        hf_token=HF_TOKEN,
        paddleocr_url=PADDLEOCR_URL,
        ocr_prompt=OCR_PROMPT,
        hf_max_tokens=HF_MAX_TOKENS,
        max_retries=MAX_RETRIES,
    )


def _validate_model_id(model_id: Optional[str]) -> str:
    return validate_model_id(model_id)


def _validate_hf_inference_url(value: Optional[str]) -> str:
    return validate_hf_inference_url(value)


def _bearer_token(authorization: Optional[str]) -> Optional[str]:
    return bearer_token(authorization)


def _set_no_store(response: Response) -> None:
    response.headers.update(NO_STORE_HEADERS)


def _get_pipeline_semaphore() -> asyncio.Semaphore:
    return get_pipeline_semaphore(MAX_ACTIVE_JOBS)


def _count_pdf_pages_sync(pdf_bytes: bytes) -> int:
    return count_pdf_pages_sync(pdf_bytes)


app = FastAPI(
    title="Bookflow Optional OCR Engine",
    version="2.0.0",
    description="Optional remote visual OCR with provider checks and real-time SSE updates.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from routers.social import router as social_router

    app.include_router(social_router)
except ImportError as exc:
    logger.warning("Could not load social router: %s", exc)


@app.post("/api/ocr/scan")
async def scan_pdf_endpoint(
    background_tasks: BackgroundTasks,
    response: Response,
    file: UploadFile = File(..., description="PDF file to scan"),
    model_id: Optional[str] = Form(None),
    batch_size: Optional[int] = Form(DEFAULT_BATCH_SIZE),
    force_ocr: Optional[bool] = Form(False),
    ocr_profile: str = Form("small"),
    authorization: Optional[str] = Header(None),
    x_hf_token: Optional[str] = Header(None),
):
    """
    Initiates asynchronous visual OCR scan of an uploaded PDF using PaddleOCR first and Hugging Face fallback.
    Returns a job_id to stream progress via SSE at /api/ocr/progress/{job_id}.
    """
    _set_no_store(response)
    await prune_stale_jobs()
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported for visual scanning.",
        )

    declared_size = getattr(file, "size", None)
    if declared_size is not None and declared_size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded PDF exceeds maximum size of {MAX_UPLOAD_MB} MB.",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty.",
        )
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded PDF exceeds maximum size of {MAX_UPLOAD_MB} MB.",
        )

    try:
        page_count = await asyncio.to_thread(_count_pdf_pages_sync, pdf_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    try:
        active_model = _validate_model_id(model_id or OCR_MODEL)
        _validate_hf_inference_url(HF_INFERENCE_URL)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    job_id = str(uuid.uuid4())
    effective_batch_size = max(1, min(batch_size or DEFAULT_BATCH_SIZE, 32))
    effective_ocr_profile = ocr_profile.strip().lower()
    if effective_ocr_profile not in {"small", "medium"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OCR profile must be 'small' or 'medium'.",
        )
    token = x_hf_token or _bearer_token(authorization)

    new_job = OCRJob(
        job_id=job_id,
        filename=filename,
        total_pages=page_count,
        status="processing",
    )

    async with jobs_lock:
        in_flight = sum(job.status in {"queued", "processing"} for job in jobs.values())
        if len(jobs) >= MAX_JOBS or in_flight >= MAX_PENDING_JOBS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="OCR job capacity is currently full. Try again later.",
            )
        jobs[job_id] = new_job

    background_tasks.add_task(
        _run_ocr_pipeline_job,
        job_id=job_id,
        pdf_bytes=pdf_bytes,
        model_id=active_model,
        batch_size=effective_batch_size,
        api_key=token,
        ocr_profile=effective_ocr_profile,
        force_ocr=bool(force_ocr),
    )

    return {
        "success": True,
        "job_id": job_id,
        "filename": filename,
        "total_pages": page_count,
        "model": active_model,
        "ocr_profile": effective_ocr_profile,
        "batch_size": effective_batch_size,
        "status": "processing",
        "stream_url": f"/api/ocr/progress/{job_id}",
    }


@app.get("/api/ocr/progress/{job_id}")
async def get_ocr_progress_sse(job_id: str, response: Response):
    """
    Real-Time Server-Sent Events (SSE) progress endpoint.
    Streams page processing state with heartbeat keepalives for desktop and mobile clients.
    """
    _set_no_store(response)
    async with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    if len(job.subscribers) >= MAX_SUBSCRIBERS_PER_JOB:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many progress subscribers for this OCR job.",
        )
    subscriber_queue: asyncio.Queue[str] = asyncio.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE)
    async with jobs_lock:
        if len(job.subscribers) >= MAX_SUBSCRIBERS_PER_JOB:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many progress subscribers for this OCR job.",
            )
        job.subscribers.append(subscriber_queue)

    return build_progress_response(
        progress_events(job, subscriber_queue, jobs_lock),
        headers=NO_STORE_HEADERS,
    )


@app.get("/api/ocr/job/{job_id}")
async def get_ocr_job_status(job_id: str, response: Response):
    """Retrieve current OCR job snapshot and all processed pages."""
    _set_no_store(response)
    async with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    elapsed = round((job.completed_at or time.time()) - job.created_at, 2)
    pages_per_second = round(job.current_page / max(0.1, elapsed), 2)
    percent = round((job.current_page / max(1, job.total_pages)) * 100, 1)

    return {
        "job_id": job.job_id,
        "filename": job.filename,
        "status": job.status,
        "current_page": job.current_page,
        "total_pages": job.total_pages,
        "percent": percent,
        "total_words": job.total_words,
        "pages_per_second": pages_per_second,
        "elapsed_seconds": elapsed,
        "pages": job.pages,
        "markdown": job.markdown,
        "error": job.error,
    }


@app.get("/api/ocr/result/{job_id}")
async def get_ocr_result_markdown(job_id: str, response: Response):
    """Retrieve final structured Markdown document for a completed job."""
    _set_no_store(response)
    async with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    if job.status != "completed":
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "job_id": job.job_id,
                "status": job.status,
                "message": "Job is still processing. Check /api/ocr/progress/{job_id}.",
                "current_page": job.current_page,
                "total_pages": job.total_pages,
            },
            headers=NO_STORE_HEADERS,
        )

    return {
        "job_id": job.job_id,
        "filename": job.filename,
        "total_pages": job.total_pages,
        "total_words": job.total_words,
        "markdown": job.markdown,
        "pages": job.pages,
    }


@app.post("/api/ocr/cancel/{job_id}")
async def cancel_ocr_job(job_id: str, response: Response):
    """Cancel an active in-progress OCR job and notify all connected SSE clients."""
    _set_no_store(response)
    pipeline_task: Optional[asyncio.Task[Any]] = None
    async with jobs_lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job '{job_id}' not found.",
            )
        if job.status not in {"queued", "processing"}:
            return {"success": False, "message": f"Job '{job_id}' is already {job.status}."}
        pipeline_task = job.pipeline_task
        job.status = "canceled"
        job.error = "Scan was canceled by user."
        job.pages.clear()
        job.markdown = ""
        job.total_words = 0
        job.updated_at = time.time()

    await notify_subscribers(
        job,
        "error",
        {
            "job_id": job.job_id,
            "status": "canceled",
            "error": "Scan was canceled by user.",
        },
    )
    if pipeline_task is not None and not pipeline_task.done():
        pipeline_task.cancel()
        try:
            await pipeline_task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
    return {"success": True, "message": f"Job '{job_id}' canceled successfully."}


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint for Docker compose and load balancers."""
    try:
        inference_url = _validate_hf_inference_url(HF_INFERENCE_URL) or None
    except ValueError:
        inference_url = None
    return {
        "status": "healthy",
        "service": "bookflow-ocr-fastapi",
        "model": OCR_MODEL or None,
        "remote_ocr_configured": bool(OCR_MODEL),
        "paddleocr_configured": bool(PADDLEOCR_URL),
        "paddleocr_profiles": ["small", "medium"],
        "inference_url": inference_url,
        "token_configured": bool(HF_TOKEN and HF_TOKEN.strip() and HF_TOKEN.strip() != "EMPTY"),
        "thread_workers": THREAD_POOL_WORKERS,
        "default_batch_size": DEFAULT_BATCH_SIZE,
    }


def _render_pdf_pages_sync(
    pdf_bytes: bytes,
    start_idx: int,
    end_idx: int,
    force_ocr: bool = False,
):
    return render_pdf_pages_sync_service(
        pdf_bytes,
        start_idx,
        end_idx,
        force_ocr,
        render_scale=RENDER_SCALE,
    )


async def render_pdf_pages_async(
    pdf_bytes: bytes,
    start_idx: int,
    end_idx: int,
    force_ocr: bool = False,
):
    return await render_pdf_pages_async_service(
        pdf_bytes,
        start_idx,
        end_idx,
        force_ocr,
        executor=executor,
        render_scale=RENDER_SCALE,
    )


async def ensure_hf_inference_support(
    client,
    model_id: str,
    api_key: Optional[str] = None,
) -> None:
    await ensure_hf_inference_support_service(
        client,
        model_id,
        api_key,
        inference_url=HF_INFERENCE_URL,
        hf_token=HF_TOKEN,
    )


def hf_inference_url_for_model(model_id: str) -> str:
    return hf_inference_url_for_model_service(model_id, inference_url=HF_INFERENCE_URL)


def build_hf_chat_payload(model_id: str, image_bytes: bytes) -> Dict[str, Any]:
    return build_hf_chat_payload_service(
        model_id,
        image_bytes,
        ocr_prompt=OCR_PROMPT,
        hf_max_tokens=HF_MAX_TOKENS,
    )


async def call_paddleocr(
    client,
    page_number: int,
    image_bytes: bytes,
    ocr_profile: str = "small",
    *,
    paddleocr_url: Optional[str] = None,
):
    return await call_paddleocr_service(
        client,
        page_number,
        image_bytes,
        ocr_profile,
        paddleocr_url=PADDLEOCR_URL if paddleocr_url is None else paddleocr_url,
    )


async def call_ocr_with_retry(
    client,
    page_number: int,
    image_b64: Optional[str],
    native_text: str,
    is_native: bool,
    model_id: str,
    api_key: Optional[str] = None,
    ocr_profile: str = "small",
):
    return await call_ocr_with_retry_service(
        client,
        page_number,
        image_b64,
        native_text,
        is_native,
        model_id,
        api_key,
        ocr_profile,
        config=_provider_config(),
        paddle_call=call_paddleocr,
    )


def _offer_subscriber_message(queue: asyncio.Queue[str], message: str) -> None:
    offer_subscriber_message(queue, message)


async def notify_subscribers(
    job: OCRJob,
    event_type: str = "progress",
    data_override: Optional[Dict[str, Any]] = None,
) -> None:
    await notify_subscribers_service(job, event_type, data_override)


async def process_ocr_pipeline(
    job_id: str,
    pdf_bytes: bytes,
    model_id: str,
    batch_size: int,
    api_key: Optional[str] = None,
    ocr_profile: str = "small",
    force_ocr: bool = False,
) -> None:
    await process_ocr_pipeline_service(
        job_id,
        pdf_bytes,
        model_id,
        batch_size,
        api_key,
        ocr_profile,
        force_ocr,
        job_store=jobs,
        jobs_lock=jobs_lock,
        notify_subscribers=notify_subscribers,
        render_pdf_pages=render_pdf_pages_async,
        ensure_hf_inference_support=ensure_hf_inference_support,
        call_ocr_with_retry=call_ocr_with_retry,
        provider_config=_provider_config(),
    )


async def _run_ocr_pipeline_job(
    job_id: str,
    pdf_bytes: bytes,
    model_id: str,
    batch_size: int,
    api_key: Optional[str] = None,
    ocr_profile: str = "small",
    force_ocr: bool = False,
) -> None:
    await run_ocr_pipeline_job_service(
        job_id,
        pdf_bytes,
        model_id,
        batch_size,
        api_key,
        ocr_profile,
        force_ocr,
        job_store=jobs,
        jobs_lock=jobs_lock,
        pipeline_runner=process_ocr_pipeline,
        semaphore_getter=_get_pipeline_semaphore,
    )


async def prune_stale_jobs(ttl_seconds: float = 3600.0) -> None:
    await prune_stale_jobs_service(ttl_seconds, job_store=jobs, store_lock=jobs_lock)


try:
    from app.routers import health_router, ocr_router, documents_router, reader_router

    app.include_router(health_router)
    app.include_router(ocr_router)
    app.include_router(documents_router)
    app.include_router(reader_router)
except ImportError:
    pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
