import asyncio
import logging
import time
from typing import Any, Awaitable, Callable, Coroutine, Dict, List, Optional

import httpx

from .ocr_jobs import OCRJob, PageData
from .ocr_providers import OCRProviderConfig

logger = logging.getLogger("bookflow.ocr")

JobStore = Dict[str, OCRJob]
NotifySubscribers = Callable[..., Awaitable[None]]
RenderPages = Callable[..., Awaitable[List[Dict[str, Any]]]]
EnsureProvider = Callable[..., Awaitable[None]]
CallOcr = Callable[..., Coroutine[Any, Any, PageData]]
PipelineRunner = Callable[..., Awaitable[None]]
SemaphoreGetter = Callable[[], asyncio.Semaphore]


async def process_ocr_pipeline(
    job_id: str,
    pdf_bytes: bytes,
    model_id: str,
    batch_size: int,
    api_key: Optional[str] = None,
    ocr_profile: str = "small",
    force_ocr: bool = False,
    *,
    job_store: JobStore,
    jobs_lock: asyncio.Lock,
    notify_subscribers: NotifySubscribers,
    render_pdf_pages: RenderPages,
    ensure_hf_inference_support: EnsureProvider,
    call_ocr_with_retry: CallOcr,
    provider_config: OCRProviderConfig,
) -> None:
    async with jobs_lock:
        job = job_store.get(job_id)
    if not job:
        return

    batch: List[Dict[str, Any]] = []
    try:
        await notify_subscribers(job, "status", {"status": "processing", "total_pages": job.total_pages})

        limits = httpx.Limits(max_keepalive_connections=batch_size, max_connections=batch_size * 2)
        async with httpx.AsyncClient(timeout=60.0, limits=limits) as http_client:
            hf_checked = False

            for batch_start in range(0, job.total_pages, batch_size):
                if job.status == "canceled":
                    return

                batch_end = min(batch_start + batch_size, job.total_pages)
                batch = await render_pdf_pages(pdf_bytes, batch_start, batch_end, force_ocr=force_ocr)

                if (
                    not hf_checked
                    and any(not page.get("is_native", False) for page in batch)
                    and not provider_config.paddleocr_url
                ):
                    try:
                        await ensure_hf_inference_support(http_client, model_id, api_key)
                    except Exception as exc:
                        logger.warning(
                            "Remote OCR preflight failed; image pages will use native-text fallback: %s",
                            exc,
                        )
                    hf_checked = True

                page_tasks = [
                    asyncio.create_task(
                        call_ocr_with_retry(
                            client=http_client,
                            page_number=page["page_number"],
                            image_b64=page["image_b64"],
                            native_text=page["native_text"],
                            is_native=page.get("is_native", False),
                            model_id=model_id,
                            api_key=api_key,
                            ocr_profile=ocr_profile,
                        )
                    )
                    for page in batch
                ]
                try:
                    gathered_results: List[Any] = await asyncio.gather(
                        *page_tasks,
                        return_exceptions=True,
                    )
                finally:
                    for page_task in page_tasks:
                        if not page_task.done():
                            page_task.cancel()
                    await asyncio.gather(*page_tasks, return_exceptions=True)
                    for page in batch:
                        page["image_b64"] = None

                batch_results: List[PageData] = []
                for result in gathered_results:
                    if isinstance(result, BaseException):
                        logger.warning("OCR page task raised: %s", result)
                        batch_results.append(
                            PageData(
                                page_number=0,
                                text="",
                                word_count=0,
                                latency_ms=0.0,
                                success=False,
                                error=str(result) or "OCR page task failed.",
                            )
                        )
                    else:
                        batch_results.append(result)

                if job.status == "canceled":
                    return

                page_numbers = [page["page_number"] for page in batch]
                for index, result in enumerate(batch_results):
                    if result.page_number == 0 and page_numbers:
                        result.page_number = page_numbers[min(index, len(page_numbers) - 1)]

                for result in batch_results:
                    async with jobs_lock:
                        if job.status != "processing":
                            return
                        job.current_page += 1
                        job.total_words += result.word_count
                        job.pages.append({
                            "page_number": result.page_number,
                            "text": result.text,
                            "word_count": result.word_count,
                            "latency_ms": result.latency_ms,
                            "success": result.success,
                            "error": result.error,
                        })
                    await notify_subscribers(job, "progress")

        failed_pages = [page for page in job.pages if not page["success"]]
        successful_pages = [page for page in job.pages if page["success"]]
        if not successful_pages:
            page_numbers = ", ".join(str(page["page_number"]) for page in failed_pages[:10])
            raise ValueError(f"OCR could not read page(s): {page_numbers}.")
        if failed_pages:
            skipped = ", ".join(str(page["page_number"]) for page in failed_pages)
            logger.warning(
                "Job %s: %s/%s pages readable; skipped unreadable page(s): %s.",
                job_id,
                len(successful_pages),
                job.total_pages,
                skipped,
            )

        async with jobs_lock:
            if job.status != "processing":
                return
            job.pages.sort(key=lambda page: page["page_number"])
            job.markdown = "\n\n---\n\n".join(
                f"<!-- Page {page['page_number']} -->\n\n{page['text']}"
                for page in job.pages
                if page["text"]
            )
            job.status = "completed"
            completed_at = time.time()
            job.completed_at = completed_at
            job.updated_at = completed_at

            elapsed = round(completed_at - job.created_at, 2)
            pages_per_second = round(job.total_pages / max(0.1, elapsed), 2)
            completion_data = {
                "job_id": job.job_id,
                "filename": job.filename,
                "status": "completed",
                "current_page": job.total_pages,
                "total_pages": job.total_pages,
                "percent": 100.0,
                "total_words": job.total_words,
                "pages_per_second": pages_per_second,
                "elapsed_seconds": elapsed,
                "failed_pages": [page["page_number"] for page in failed_pages],
                "markdown": job.markdown,
                "pages": job.pages,
            }
        await notify_subscribers(job, "completed", completion_data)

    except asyncio.CancelledError:
        should_notify = False
        async with jobs_lock:
            if job.status == "processing":
                job.status = "canceled"
                job.error = "Scan was canceled by user."
                job.pages.clear()
                job.markdown = ""
                job.total_words = 0
                job.updated_at = time.time()
                should_notify = True
        if should_notify:
            await notify_subscribers(job, "error", {
                "job_id": job.job_id,
                "status": "canceled",
                "error": "Scan was canceled by user.",
            })
        raise
    except Exception as exc:
        logger.error("OCR Pipeline failed for job %s: %s", job_id, exc, exc_info=True)
        async with jobs_lock:
            if job.status in {"canceled", "completed", "failed"}:
                return
            job.status = "failed"
            job.error = str(exc)
            job.pages.clear()
            job.markdown = ""
            job.total_words = 0
            job.updated_at = time.time()
        await notify_subscribers(job, "error", {
            "job_id": job.job_id,
            "status": "failed",
            "error": str(exc),
        })
    finally:
        for page in batch:
            page["image_b64"] = None


async def run_ocr_pipeline_job(
    job_id: str,
    pdf_bytes: bytes,
    model_id: str,
    batch_size: int,
    api_key: Optional[str] = None,
    ocr_profile: str = "small",
    force_ocr: bool = False,
    *,
    job_store: JobStore,
    jobs_lock: asyncio.Lock,
    pipeline_runner: PipelineRunner,
    semaphore_getter: SemaphoreGetter,
) -> None:
    task = asyncio.current_task()
    async with jobs_lock:
        job = job_store.get(job_id)
        if not job or job.status in {"canceled", "completed", "failed"}:
            return
        job.pipeline_task = task

    try:
        async with semaphore_getter():
            async with jobs_lock:
                job = job_store.get(job_id)
                if not job or job.status in {"canceled", "completed", "failed"}:
                    return
                job.status = "processing"
                job.updated_at = time.time()
            await pipeline_runner(
                job_id=job_id,
                pdf_bytes=pdf_bytes,
                model_id=model_id,
                batch_size=batch_size,
                api_key=api_key,
                ocr_profile=ocr_profile,
                force_ocr=force_ocr,
            )
    except asyncio.CancelledError:
        raise
    finally:
        async with jobs_lock:
            job = job_store.get(job_id)
            if job and job.pipeline_task is task:
                job.pipeline_task = None
