"""Reader utility endpoints for text segmentation, reading metrics, and notes export/import."""

import time
import json
import os
import urllib.request
import urllib.error
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse, JSONResponse
from ..services.text_service import TextService, get_text_service
from ..models.reader import (
    SegmentRequest,
    SegmentResponse,
    ReadingTimeRequest,
    ReadingTimeResponse,
    ExportPayload,
)

router = APIRouter(tags=["Reader Utilities"])

class ReadingLensRequest(BaseModel):
    prompt: str
    passage: Optional[str] = ""
    action: Optional[str] = None

_lens_rate_limits: dict[str, list[float]] = {}
LENS_MAX_QUERIES = 40
LENS_WINDOW_SECS = 15 * 60

SYSTEM_PROMPT = """You are Bookflow Reading Lens, a reading-only assistant.

Answer only from the passage provided by the user and the user's command with the highlighted, selected text area.
Use general knowledge or interesting facts about the related topic of the selected text if the users ask about it, and if there isn't anything interesting, find the info about it via the chatbot.

Support:
- summarize
- translate
- explain
- answer a short question about the passage

If the passage does not contain enough context, say so directly.
Be concise, calm, and useful. Return plain text or Markdown only."""

@router.post("/api/reading-lens")
async def reading_lens_query(req: ReadingLensRequest, request: Request):
    client_ip = request.client.host if request.client else "anonymous"
    now = time.time()
    
    # Rate limit check
    records = [t for t in _lens_rate_limits.get(client_ip, []) if now - t < LENS_WINDOW_SECS]
    if len(records) >= LENS_MAX_QUERIES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit reached. Please wait before asking more questions.",
        )
    records.append(now)
    _lens_rate_limits[client_ip] = records

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return JSONResponse(
            content={"text": f"Reading Lens Summary:\n\nPassage Context: {req.passage[:160]}...\n\nAnswer: {req.prompt}"}
        )

    # Prepare Gemini 2.5 Flash-Lite payload
    prompt_text = f"Context Passage:\n\"\"\"\n{req.passage}\n\"\"\"\n\nUser Question/Command:\n{req.prompt}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt_text}]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    try:
        req_data = json.dumps(payload).encode("utf-8")
        gemini_req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(gemini_req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if candidates:
                content_parts = candidates[0].get("content", {}).get("parts", [])
                ans_text = "".join(p.get("text", "") for p in content_parts)
                return JSONResponse(content={"text": ans_text})
            return JSONResponse(content={"text": "No response generated."})
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        # Fallback to flash-lite model if needed
        try:
            fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={api_key}"
            gemini_req2 = urllib.request.Request(
                fallback_url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(gemini_req2, timeout=15) as resp2:
                data2 = json.loads(resp2.read().decode("utf-8"))
                candidates2 = data2.get("candidates", [])
                if candidates2:
                    content_parts2 = candidates2[0].get("content", {}).get("parts", [])
                    ans_text2 = "".join(p.get("text", "") for p in content_parts2)
                    return JSONResponse(content={"text": ans_text2})
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API error: {err_body[:200]}"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to communicate with AI service: {str(exc)}"
        )


@router.post("/api/reader/segment", response_model=SegmentResponse)
async def segment_text(
    payload: SegmentRequest,
    txt_service: TextService = Depends(get_text_service),
):
    """
    Segment input text into clean paragraphs and sentence boundaries.
    """
    paragraphs = txt_service.extract_paragraphs(payload.text)
    sentences = txt_service.extract_sentences(payload.text)
    word_count = txt_service.count_words(payload.text)
    _, _, est_label = txt_service.calculate_reading_time(word_count)
    total_seconds = int((word_count / 220) * 60)

    return SegmentResponse(
        paragraphs=paragraphs,
        sentences=sentences,
        word_count=word_count,
        estimated_reading_seconds=total_seconds,
    )


@router.post("/reading-time", response_model=ReadingTimeResponse)
async def compute_reading_time(
    payload: ReadingTimeRequest,
    txt_service: TextService = Depends(get_text_service),
):
    """
    Compute estimated reading time for a word count or raw text block.
    """
    word_count = payload.word_count
    if word_count is None:
        if payload.text is not None:
            word_count = txt_service.count_words(payload.text)
        else:
            word_count = 0

    minutes, seconds, label = txt_service.calculate_reading_time(
        word_count=word_count,
        words_per_minute=payload.words_per_minute,
    )

    return ReadingTimeResponse(
        word_count=word_count,
        words_per_minute=payload.words_per_minute,
        minutes=minutes,
        seconds=seconds,
        formatted_label=label,
    )


@router.post("/notes/export", response_model=ExportPayload)
async def export_notes(payload: ExportPayload):
    """
    Validate and return a clean, structured export bundle of user notes and bookmarks.
    """
    return payload


@router.post("/notes/import")
async def import_notes(payload: ExportPayload):
    """
    Validate an imported notes and bookmarks JSON file.
    """
    return {
        "valid": True,
        "notes_count": len(payload.notes),
        "bookmarks_count": len(payload.bookmarks),
        "document_id": payload.document_id,
        "message": "Notes payload validated successfully",
    }
