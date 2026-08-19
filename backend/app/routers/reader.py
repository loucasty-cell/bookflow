"""Reader utility endpoints for text segmentation, reading metrics, and notes export/import."""

import time
from fastapi import APIRouter, HTTPException, status
from ..services.text_service import text_service
from ..models.reader import (
    SegmentRequest,
    SegmentResponse,
    ReadingTimeRequest,
    ReadingTimeResponse,
    ExportPayload,
)

router = APIRouter(prefix="/api/reader", tags=["Reader Utilities"])


@router.post("/segment", response_model=SegmentResponse)
async def segment_text(payload: SegmentRequest):
    """
    Segment input text into clean paragraphs and sentence boundaries.
    """
    paragraphs = text_service.extract_paragraphs(payload.text)
    sentences = text_service.extract_sentences(payload.text)
    word_count = text_service.count_words(payload.text)
    _, _, est_label = text_service.calculate_reading_time(word_count)
    total_seconds = int((word_count / 220) * 60)

    return SegmentResponse(
        paragraphs=paragraphs,
        sentences=sentences,
        wordCount=word_count,
        estimatedReadingSeconds=total_seconds,
    )


@router.post("/reading-time", response_model=ReadingTimeResponse)
async def compute_reading_time(payload: ReadingTimeRequest):
    """
    Compute estimated reading time for a word count or raw text block.
    """
    word_count = payload.word_count
    if word_count is None:
        if payload.text is not None:
            word_count = text_service.count_words(payload.text)
        else:
            word_count = 0

    minutes, seconds, label = text_service.calculate_reading_time(
        word_count=word_count,
        words_per_minute=payload.words_per_minute,
    )

    return ReadingTimeResponse(
        wordCount=word_count,
        wordsPerMinute=payload.words_per_minute,
        minutes=minutes,
        seconds=seconds,
        formattedLabel=label,
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
