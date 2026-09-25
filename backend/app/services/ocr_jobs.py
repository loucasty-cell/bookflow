import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

MAX_JOBS = 100
MAX_ACTIVE_JOBS = 4
MAX_PENDING_JOBS = 8
MAX_SUBSCRIBERS_PER_JOB = 16
SUBSCRIBER_QUEUE_SIZE = 32


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
    status: str = "processing"
    current_page: int = 0
    pages: List[Dict[str, Any]] = field(default_factory=list)
    markdown: str = ""
    total_words: int = 0
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    subscribers: List[asyncio.Queue[Any]] = field(default_factory=list)
    pipeline_task: Optional[asyncio.Task[Any]] = field(default=None, repr=False)

    @property
    def task(self) -> Optional[asyncio.Task[Any]]:
        return self.pipeline_task

    @task.setter
    def task(self, value: Optional[asyncio.Task[Any]]) -> None:
        self.pipeline_task = value


jobs_lock = asyncio.Lock()
jobs: Dict[str, OCRJob] = {}
_pipeline_semaphores: Dict[Tuple[asyncio.AbstractEventLoop, int], asyncio.Semaphore] = {}


def get_pipeline_semaphore(max_active_jobs: int = MAX_ACTIVE_JOBS) -> asyncio.Semaphore:
    loop = asyncio.get_running_loop()
    active_jobs = max(1, max_active_jobs)
    key = (loop, active_jobs)
    semaphore = _pipeline_semaphores.get(key)
    if semaphore is None:
        semaphore = asyncio.Semaphore(active_jobs)
        _pipeline_semaphores[key] = semaphore
    return semaphore


async def prune_stale_jobs(
    ttl_seconds: float = 3600.0,
    *,
    job_store: Optional[Dict[str, OCRJob]] = None,
    store_lock: Optional[asyncio.Lock] = None,
) -> None:
    now = time.time()
    store = jobs if job_store is None else job_store
    lock = jobs_lock if store_lock is None else store_lock
    async with lock:
        stale_ids = [
            job_id
            for job_id, job in store.items()
            if not (
                job.status in {"queued", "processing"}
                and job.pipeline_task is not None
                and not job.pipeline_task.done()
            )
            and (
                (now - job.created_at > ttl_seconds)
                or (job.completed_at and now - job.completed_at > 1800)
            )
        ]
        for job_id in stale_ids:
            store.pop(job_id, None)
