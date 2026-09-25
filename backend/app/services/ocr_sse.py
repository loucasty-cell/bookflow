import asyncio
import json
import time
from typing import Any, AsyncGenerator, Dict, Optional

from fastapi import Response
from fastapi.responses import StreamingResponse

from .ocr_jobs import OCRJob

NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


def set_no_store(response: Response) -> None:
    response.headers.update(NO_STORE_HEADERS)


def offer_subscriber_message(queue: asyncio.Queue[str], message: str) -> None:
    try:
        queue.put_nowait(message)
        return
    except asyncio.QueueFull:
        pass
    try:
        queue.get_nowait()
    except asyncio.QueueEmpty:
        return
    try:
        queue.put_nowait(message)
    except asyncio.QueueFull:
        pass


def initial_payload(job: OCRJob) -> Dict[str, Any]:
    return {
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


def completion_payload(job: OCRJob) -> Dict[str, Any]:
    payload = {
        **initial_payload(job),
        "percent": 100.0,
        "pages_per_second": round(
            job.total_pages / max(0.1, (job.completed_at or time.time()) - job.created_at),
            2,
        ),
        "elapsed_seconds": round((job.completed_at or time.time()) - job.created_at, 2),
        "markdown": job.markdown,
    }
    return payload


def error_payload(job: OCRJob) -> Dict[str, Any]:
    return {
        "job_id": job.job_id,
        "status": job.status,
        "error": job.error or "OCR processing failed.",
    }


async def progress_events(
    job: OCRJob,
    subscriber_queue: asyncio.Queue[str],
    jobs_lock: asyncio.Lock,
) -> AsyncGenerator[str, None]:
    try:
        initial = initial_payload(job)
        yield f"event: initial\ndata: {json.dumps(initial)}\n\n"

        if job.status == "completed":
            yield f"event: completed\ndata: {json.dumps(completion_payload(job))}\n\n"
            return

        if job.status in ("failed", "canceled"):
            yield f"event: error\ndata: {json.dumps(error_payload(job))}\n\n"
            return

        while True:
            try:
                message = await asyncio.wait_for(subscriber_queue.get(), timeout=8.0)
                yield message
                if "event: completed" in message or "event: error" in message:
                    break
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
                if job.status in ("completed", "failed", "canceled"):
                    break
    except asyncio.CancelledError:
        pass
    finally:
        async with jobs_lock:
            if subscriber_queue in job.subscribers:
                job.subscribers.remove(subscriber_queue)


def build_progress_response(
    events: AsyncGenerator[str, None],
    *,
    headers: Optional[Dict[str, str]] = None,
) -> StreamingResponse:
    return StreamingResponse(
        events,
        media_type="text/event-stream",
        headers={
            **(headers or NO_STORE_HEADERS),
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def notify_subscribers(
    job: OCRJob,
    event_type: str = "progress",
    data_override: Optional[Dict[str, Any]] = None,
) -> None:
    elapsed = round(time.time() - job.created_at, 2)
    pages_per_second = round(job.current_page / max(0.1, elapsed), 2)
    percent = round((job.current_page / max(1, job.total_pages)) * 100, 1)

    payload = data_override or {
        "job_id": job.job_id,
        "filename": job.filename,
        "status": job.status,
        "current_page": job.current_page,
        "total_pages": job.total_pages,
        "percent": percent,
        "total_words": job.total_words,
        "pages_per_second": pages_per_second,
        "elapsed_seconds": elapsed,
        "latest_page": job.pages[-1] if job.pages else None,
        "error": job.error,
    }

    message = f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
    for queue in list(job.subscribers):
        offer_subscriber_message(queue, message)
