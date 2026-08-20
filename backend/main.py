"""
BookFlow High-Throughput Visual OCR Engine Backend.

Orchestrates PDF page extraction at 96 DPI in-memory using PyMuPDF (fitz),
concurrent batch processing to deepseek-ai/DeepSeek-OCR-2 on vLLM via AsyncOpenAI,
exponential backoff retries, and real-time Server-Sent Events (SSE) streaming.
"""

import os
import io
import time
import uuid
import json
import base64
import asyncio
import logging
from typing import Dict, List, Optional, Any, AsyncGenerator
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor

import fitz  # PyMuPDF
import httpx
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bookflow.ocr")

from dotenv import load_dotenv

# Try loading from backend/.env or root ../.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

# Environment configuration
OCR_MODEL = os.getenv("OCR_MODEL", "deepseek-ai/DeepSeek-OCR-2")
HF_TOKEN = os.getenv("HF_TOKEN", os.getenv("HF_API_KEY", ""))
HF_INFERENCE_URL = os.getenv("HF_INFERENCE_URL", "https://api-inference.huggingface.co/models")
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,*",
).split(",")

# Batch & execution constants
DEFAULT_BATCH_SIZE = 16
RENDER_DPI = 96
RENDER_SCALE = RENDER_DPI / 72.0  # 1.3333x zoom
MAX_RETRIES = 3
THREAD_POOL_WORKERS = min(32, (os.cpu_count() or 4) * 4)

executor = ThreadPoolExecutor(max_workers=THREAD_POOL_WORKERS)


@dataclass
class PageData:
    page_number: int
    text: str = ""
    word_count: int = 0
    latency_ms: float = 0.0
    success: bool = False
    error: Optional[str] = None


@dataclass
class OCRJob:
    job_id: str
    filename: str
    total_pages: int
    status: str = "processing"  # "processing", "completed", "failed"
    current_page: int = 0
    pages: List[Dict[str, Any]] = field(default_factory=list)
    markdown: str = ""
    total_words: int = 0
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    subscribers: List[asyncio.Queue] = field(default_factory=list)


# In-memory thread-safe jobs store
jobs_lock = asyncio.Lock()
jobs: Dict[str, OCRJob] = {}


app = FastAPI(
    title="BookFlow High-Throughput OCR Engine",
    version="2.0.0",
    description="Blazing-fast visual book scanning with DeepSeek-OCR-2 on vLLM and real-time SSE updates.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 2: Social Resonance Router (DB-less mockup)
try:
    from routers.social import router as social_router
    app.include_router(social_router)
except ImportError as e:
    logger.warning(f"Could not load social router: {e}")


def _render_pdf_pages_sync(pdf_bytes: bytes, force_ocr: bool = False) -> List[Dict[str, Any]]:
    """
    Synchronous high-speed CPU worker to extract pages.
    Native text pages are processed in microseconds; scanned image pages are rendered at 96 DPI.
    Eliminates disk I/O bottlenecks.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    rendered_pages = []
    matrix = fitz.Matrix(RENDER_SCALE, RENDER_SCALE)

    for idx in range(len(doc)):
        page = doc.load_page(idx)
        # Extract native blocks / text with structure preservation
        blocks = page.get_text("blocks")
        native_paragraphs = []
        for b in blocks:
            text = (b[4] or "").strip()
            if text and len(text) > 2:
                native_paragraphs.append(text)
        
        native_text = "\n\n".join(native_paragraphs).strip()
        word_count = len(native_text.split())

        # If page has sufficient native selectable text (> 15 words) and force_ocr is False,
        # we can skip costly pixmap rasterization to process 600 pages in < 1 second.
        if word_count >= 15 and not force_ocr:
            rendered_pages.append({
                "page_number": idx + 1,
                "image_b64": None,
                "native_text": native_text,
                "is_native": True,
            })
        else:
            # Render visual page to pixmap at 96 DPI in memory
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            jpeg_bytes = pix.tobytes("jpeg", jpg_quality=85)
            b64_str = base64.b64encode(jpeg_bytes).decode("utf-8")
            rendered_pages.append({
                "page_number": idx + 1,
                "image_b64": b64_str,
                "native_text": native_text,
                "is_native": False,
            })

    doc.close()
    return rendered_pages


async def render_pdf_pages_async(pdf_bytes: bytes, force_ocr: bool = False) -> List[Dict[str, Any]]:
    """Asynchronously offload PDF page rendering to thread pool executor."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(executor, _render_pdf_pages_sync, pdf_bytes, force_ocr)


async def call_ocr_with_retry(
    client: httpx.AsyncClient,
    page_number: int,
    image_b64: Optional[str],
    native_text: str,
    is_native: bool,
    model_id: str,
    api_key: Optional[str] = None,
) -> PageData:
    """
    High-throughput visual OCR worker using Hugging Face Inference API.
    Native text pages are processed in < 1ms; image scans are sent to Hugging Face with exponential backoff retries.
    """
    start_time = time.perf_counter()

    # Fast path for selectable text pages
    if is_native and native_text and len(native_text.split()) >= 15:
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return PageData(
            page_number=page_number,
            text=native_text,
            word_count=len(native_text.split()),
            latency_ms=latency,
            success=True,
        )

    if not image_b64:
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return PageData(
            page_number=page_number,
            text=native_text or "",
            word_count=len(native_text.split()) if native_text else 0,
            latency_ms=latency,
            success=bool(native_text),
        )

    token = (api_key or HF_TOKEN or "").strip()
    last_error: Optional[str] = None
    image_bytes = base64.b64decode(image_b64)

    headers = {
        "Accept": "application/json",
        "User-Agent": "Bookflow-OCR-Client/1.0",
    }
    if token and token != "EMPTY":
        headers["Authorization"] = f"Bearer {token}"

    candidate_urls = [
        f"{HF_INFERENCE_URL}/{model_id}",
        f"https://router.huggingface.co/hf-inference/models/{model_id}",
    ]

    for attempt in range(1, MAX_RETRIES + 1):
        for target_url in candidate_urls:
            try:
                response = await client.post(
                    target_url,
                    headers=headers,
                    content=image_bytes,
                )

                if response.status_code == 200:
                    raw_result = response.json()
                    if isinstance(raw_result, list) and len(raw_result) > 0:
                        item = raw_result[0]
                        if isinstance(item, dict):
                            extracted_text = (
                                item.get("generated_text")
                                or item.get("text")
                                or item.get("caption")
                                or str(item)
                            ).strip()
                        else:
                            extracted_text = str(item).strip()
                    elif isinstance(raw_result, dict):
                        extracted_text = (
                            raw_result.get("generated_text")
                            or raw_result.get("text")
                            or raw_result.get("caption")
                            or str(raw_result)
                        ).strip()
                    else:
                        extracted_text = str(raw_result).strip()

                    latency = round((time.perf_counter() - start_time) * 1000, 2)
                    return PageData(
                        page_number=page_number,
                        text=extracted_text,
                        word_count=len(extracted_text.split()),
                        latency_ms=latency,
                        success=True,
                    )

                if response.status_code == 503:
                    try:
                        info = response.json()
                        estimated_wait = min(float(info.get("estimated_time", 5.0)), 25.0)
                    except Exception:
                        estimated_wait = 5.0
                    logger.info(
                        f"[Page {page_number}] Model loading on Hugging Face. Waiting {estimated_wait}s (attempt {attempt}/{MAX_RETRIES})."
                    )
                    await asyncio.sleep(estimated_wait)
                    break

                if response.status_code == 401:
                    raise ValueError(
                        "Hugging Face API returned 401 Unauthorized. Please verify your HF_TOKEN / API key."
                    )

                if response.status_code == 429:
                    wait_time = 2.0 * attempt
                    logger.warning(f"[Page {page_number}] HF Rate limited. Waiting {wait_time}s.")
                    await asyncio.sleep(wait_time)
                    break

                if response.status_code == 404 and target_url != candidate_urls[-1]:
                    continue

                raise ValueError(f"Hugging Face API returned status {response.status_code}: {response.text[:200]}")

            except Exception as exc:
                last_error = str(exc)
                logger.warning(
                    f"[Page {page_number}] Attempt {attempt}/{MAX_RETRIES} ({target_url}) failed: {exc}"
                )
                if "401" in str(exc):
                    break
        if attempt < MAX_RETRIES:
            await asyncio.sleep(0.5 * (2 ** (attempt - 1)))

    # Fallback to native text if available
    latency = round((time.perf_counter() - start_time) * 1000, 2)
    if native_text and len(native_text.split()) >= 3:
        logger.info(f"[Page {page_number}] Falling back to native selectable text extraction.")
        return PageData(
            page_number=page_number,
            text=native_text,
            word_count=len(native_text.split()),
            latency_ms=latency,
            success=True,
            error=f"HF fallback: {last_error}",
        )

    return PageData(
        page_number=page_number,
        text="",
        word_count=0,
        latency_ms=latency,
        success=False,
        error=last_error or "OCR processing failed after retries.",
    )


async def notify_subscribers(job: OCRJob, event_type: str = "progress", data_override: Optional[dict] = None):
    """Broadcast progress update to all active SSE subscribers for a job."""
    elapsed = round(time.time() - job.created_at, 2)
    pps = round(job.current_page / max(0.1, elapsed), 2)
    percent = round((job.current_page / max(1, job.total_pages)) * 100, 1)

    payload = data_override or {
        "job_id": job.job_id,
        "filename": job.filename,
        "status": job.status,
        "current_page": job.current_page,
        "total_pages": job.total_pages,
        "percent": percent,
        "total_words": job.total_words,
        "pages_per_second": pps,
        "elapsed_seconds": elapsed,
        "latest_page": job.pages[-1] if job.pages else None,
        "error": job.error,
    }

    message = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"

    for queue in list(job.subscribers):
        try:
            await queue.put(message)
        except Exception as e:
            logger.debug(f"Subscriber queue error: {e}")


async def process_ocr_pipeline(
    job_id: str,
    pdf_bytes: bytes,
    model_id: str,
    batch_size: int,
    api_key: Optional[str] = None,
):
    """
    Main background OCR execution pipeline.
    1. Extracts all pages to in-memory JPEG at 96 DPI.
    2. Groups into non-blocking batches of 16 pages.
    3. Runs concurrent async calls to Hugging Face Inference API.
    4. Streams real-time page updates via SSE.
    """
    async with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return

    try:
        # Step 1: Render pages in parallel in memory
        rendered_pages = await render_pdf_pages_async(pdf_bytes)
        job.total_pages = len(rendered_pages)
        await notify_subscribers(job, "status", {"status": "processing", "total_pages": job.total_pages})

        # Step 2: Batch processing (16 pages per batch)
        all_results: List[PageData] = []

        limits = httpx.Limits(max_keepalive_connections=batch_size, max_connections=batch_size * 2)
        async with httpx.AsyncClient(timeout=60.0, limits=limits) as http_client:
            for batch_start in range(0, len(rendered_pages), batch_size):
                batch = rendered_pages[batch_start : batch_start + batch_size]
    
                # Execute the 16 pages in this batch concurrently
                tasks = [
                    call_ocr_with_retry(
                        client=http_client,
                        page_number=p["page_number"],
                        image_b64=p["image_b64"],
                        native_text=p["native_text"],
                        is_native=p.get("is_native", False),
                        model_id=model_id,
                        api_key=api_key,
                    )
                    for p in batch
                ]
                batch_results: List[PageData] = await asyncio.gather(*tasks)
    
                for res in batch_results:
                    all_results.append(res)
                    job.current_page += 1
                    job.total_words += res.word_count
                    page_dict = {
                        "page_number": res.page_number,
                        "text": res.text,
                        "word_count": res.word_count,
                        "latency_ms": res.latency_ms,
                        "success": res.success,
                        "error": res.error,
                    }
                    job.pages.append(page_dict)

            # Free base64 images from memory after batch completion
            for p in batch:
                p["image_b64"] = None

            await notify_subscribers(job, "progress")

        # Sort pages by page_number
        job.pages.sort(key=lambda x: x["page_number"])
        job.markdown = "\n\n---\n\n".join(
            f"<!-- Page {p['page_number']} -->\n\n{p['text']}"
            for p in job.pages if p["text"]
        )
        job.status = "completed"
        job.completed_at = time.time()
        job.updated_at = time.time()

        elapsed = round(job.completed_at - job.created_at, 2)
        pps = round(job.total_pages / max(0.1, elapsed), 2)

        completion_data = {
            "job_id": job.job_id,
            "filename": job.filename,
            "status": "completed",
            "current_page": job.total_pages,
            "total_pages": job.total_pages,
            "percent": 100.0,
            "total_words": job.total_words,
            "pages_per_second": pps,
            "elapsed_seconds": elapsed,
            "markdown": job.markdown,
            "pages": job.pages,
        }
        await notify_subscribers(job, "completed", completion_data)

    except Exception as exc:
        logger.error(f"OCR Pipeline failed for job {job_id}: {exc}", exc_info=True)
        job.status = "failed"
        job.error = str(exc)
        job.updated_at = time.time()
        await notify_subscribers(job, "error", {
            "job_id": job.job_id,
            "status": "failed",
            "error": str(exc),
        })


@app.post("/api/ocr/scan")
async def scan_pdf_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file to scan"),
    model_id: Optional[str] = Form(None),
    batch_size: Optional[int] = Form(DEFAULT_BATCH_SIZE),
    force_ocr: Optional[bool] = Form(False),
    api_key: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
    x_hf_token: Optional[str] = Header(None),
):
    """
    Initiates asynchronous visual OCR scan of an uploaded PDF using Hugging Face Inference API.
    Returns a job_id to stream progress via SSE at /api/ocr/progress/{job_id}.
    """
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported for visual scanning.",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty.",
        )

    # Quickly read page count with PyMuPDF
    try:
        temp_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(temp_doc)
        temp_doc.close()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted PDF file: {e}",
        )

    job_id = str(uuid.uuid4())
    active_model = model_id or OCR_MODEL
    effective_batch_size = max(1, min(batch_size or DEFAULT_BATCH_SIZE, 32))
    token = api_key or x_hf_token or (authorization.replace("Bearer ", "") if authorization else None)

    new_job = OCRJob(
        job_id=job_id,
        filename=filename,
        total_pages=page_count,
        status="processing",
    )

    async with jobs_lock:
        # Cleanup old completed/failed jobs to prevent memory leaks
        current_time = time.time()
        stale_jobs = [
            jid for jid, j in jobs.items() 
            if j.status in ("completed", "failed") and (current_time - j.updated_at) > 3600
        ]
        for jid in stale_jobs:
            del jobs[jid]
            
        jobs[job_id] = new_job

    background_tasks.add_task(
        process_ocr_pipeline,
        job_id=job_id,
        pdf_bytes=pdf_bytes,
        model_id=active_model,
        batch_size=effective_batch_size,
        api_key=token,
    )

    return {
        "success": True,
        "job_id": job_id,
        "filename": filename,
        "total_pages": page_count,
        "model": active_model,
        "batch_size": effective_batch_size,
        "status": "processing",
        "stream_url": f"/api/ocr/progress/{job_id}",
    }


@app.get("/api/ocr/progress/{job_id}")
async def get_ocr_progress_sse(job_id: str):
    """
    Real-Time Server-Sent Events (SSE) progress endpoint.
    Streams page processing state with heartbeat keepalives for desktop and mobile clients.
    """
    async with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    subscriber_queue: asyncio.Queue = asyncio.Queue()
    job.subscribers.append(subscriber_queue)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Send initial state immediately
            initial_payload = {
                "job_id": job.job_id,
                "filename": job.filename,
                "status": job.status,
                "current_page": job.current_page,
                "total_pages": job.total_pages,
                "percent": round((job.current_page / max(1, job.total_pages)) * 100, 1),
                "total_words": job.total_words,
                "pages": job.pages,
                "markdown": job.markdown if job.status == "completed" else "",
            }
            yield f"event: initial\ndata: {json.dumps(initial_payload)}\n\n"

            if job.status in ("completed", "failed"):
                return

            while True:
                try:
                    msg = await asyncio.wait_for(subscriber_queue.get(), timeout=8.0)
                    yield msg
                    if "event: completed" in msg or "event: error" in msg:
                        break
                except asyncio.TimeoutError:
                    # Keepalive heartbeat comment for mobile browsers
                    yield ": keepalive\n\n"
                    if job.status in ("completed", "failed"):
                        break
        except asyncio.CancelledError:
            pass
        finally:
            if subscriber_queue in job.subscribers:
                job.subscribers.remove(subscriber_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/ocr/job/{job_id}")
async def get_ocr_job_status(job_id: str):
    """Retrieve current OCR job snapshot and all processed pages."""
    async with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    elapsed = round((job.completed_at or time.time()) - job.created_at, 2)
    pps = round(job.current_page / max(0.1, elapsed), 2)
    percent = round((job.current_page / max(1, job.total_pages)) * 100, 1)

    return {
        "job_id": job.job_id,
        "filename": job.filename,
        "status": job.status,
        "current_page": job.current_page,
        "total_pages": job.total_pages,
        "percent": percent,
        "total_words": job.total_words,
        "pages_per_second": pps,
        "elapsed_seconds": elapsed,
        "pages": job.pages,
        "markdown": job.markdown,
        "error": job.error,
    }


@app.get("/api/ocr/result/{job_id}")
async def get_ocr_result_markdown(job_id: str):
    """Retrieve final structured Markdown document for a completed job."""
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
async def cancel_ocr_job(job_id: str):
    """Cancel an active in-progress OCR job and notify all connected SSE clients."""
    async with jobs_lock:
        job = jobs.get(job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    if job.status == "processing":
        job.status = "canceled"
        job.error = "Scan was canceled by user."
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
        return {"success": True, "message": f"Job '{job_id}' canceled successfully."}

    return {"success": False, "message": f"Job '{job_id}' is already {job.status}."}


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint for Docker compose and load balancers."""
    return {
        "status": "healthy",
        "service": "bookflow-ocr-fastapi",
        "model": OCR_MODEL,
        "inference_url": HF_INFERENCE_URL,
        "token_configured": bool(HF_TOKEN and HF_TOKEN.strip() and HF_TOKEN.strip() != "EMPTY"),
        "thread_workers": THREAD_POOL_WORKERS,
        "default_batch_size": DEFAULT_BATCH_SIZE,
    }


# Try importing legacy app routers if existing codebase is present
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
