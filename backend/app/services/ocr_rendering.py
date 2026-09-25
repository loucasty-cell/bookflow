import asyncio
import base64
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Any, Dict, List, Optional

import fitz

logger = logging.getLogger("bookflow.ocr")

RENDER_DPI = 96
RENDER_SCALE = RENDER_DPI / 72.0


def count_pdf_pages_sync(pdf_bytes: bytes) -> int:
    temp_doc = None
    try:
        temp_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(temp_doc)
        if page_count < 1:
            raise ValueError("Invalid or corrupted PDF file: no loadable pages found.")
        return page_count
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Invalid or corrupted PDF file: {exc}") from exc
    finally:
        if temp_doc is not None:
            try:
                temp_doc.close()
            except Exception:
                pass


def render_pdf_pages_sync(
    pdf_bytes: bytes,
    start_idx: int,
    end_idx: int,
    force_ocr: bool = False,
    *,
    render_scale: float = RENDER_SCALE,
) -> List[Dict[str, Any]]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        total_pages = len(doc)
        rendered_pages: List[Dict[str, Any]] = []
        matrix = fitz.Matrix(render_scale, render_scale)

        for idx in range(start_idx, min(end_idx, total_pages)):
            try:
                page = doc.load_page(idx)
            except Exception as exc:
                logger.warning("[Page %s] Skipping unloadable page: %s", idx + 1, exc)
                rendered_pages.append({
                    "page_number": idx + 1,
                    "image_b64": None,
                    "native_text": "",
                    "is_native": False,
                    "unreadable": True,
                })
                continue
            try:
                blocks = page.get_text("blocks")
                native_paragraphs = []
                for block in blocks:
                    text = (block[4] or "").strip()
                    if text and len(text) > 2:
                        native_paragraphs.append(text)

                native_text = "\n\n".join(native_paragraphs).strip()
                word_count = len(native_text.split())

                if word_count >= 15 and not force_ocr:
                    rendered_pages.append({
                        "page_number": idx + 1,
                        "image_b64": None,
                        "native_text": native_text,
                        "is_native": True,
                    })
                else:
                    pix = page.get_pixmap(matrix=matrix, alpha=False)
                    jpeg_bytes = pix.tobytes("jpeg", jpg_quality=85)
                    image_b64 = base64.b64encode(jpeg_bytes).decode("utf-8")
                    rendered_pages.append({
                        "page_number": idx + 1,
                        "image_b64": image_b64,
                        "native_text": native_text,
                        "is_native": False,
                    })
            except Exception as exc:
                logger.warning("[Page %s] Skipping unreadable page: %s", idx + 1, exc)
                rendered_pages.append({
                    "page_number": idx + 1,
                    "image_b64": None,
                    "native_text": "",
                    "is_native": False,
                    "unreadable": True,
                })

        return rendered_pages
    finally:
        try:
            doc.close()
        except Exception:
            pass


async def render_pdf_pages_async(
    pdf_bytes: bytes,
    start_idx: int,
    end_idx: int,
    force_ocr: bool = False,
    *,
    executor: Optional[ThreadPoolExecutor] = None,
    render_scale: float = RENDER_SCALE,
) -> List[Dict[str, Any]]:
    loop = asyncio.get_running_loop()
    render = partial(render_pdf_pages_sync, render_scale=render_scale)
    return await loop.run_in_executor(
        executor,
        render,
        pdf_bytes,
        start_idx,
        end_idx,
        force_ocr,
    )
