"""Reader models for notes, bookmarks, segmentation, and state management."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class Note(BaseModel):
    """A reader margin note attached to a paragraph."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    paragraph_id: str = Field(alias="paragraphId")
    quote: str = Field(description="Paragraph excerpt")
    text: str = Field(description="Reader note content")
    created_at: Optional[str] = Field(default=None, alias="createdAt")


class Bookmark(BaseModel):
    """A saved bookmark reference."""

    model_config = ConfigDict(populate_by_name=True)

    paragraph_id: str = Field(alias="paragraphId")
    chapter_index: Optional[int] = Field(default=None, alias="chapterIndex")
    title: Optional[str] = None


class ReadingProgress(BaseModel):
    """Reading progress state for a book."""

    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(alias="documentId")
    progress_percent: int = Field(alias="progressPercent")
    scroll_top: int = Field(alias="scrollTop")
    current_chapter_index: int = Field(default=0, alias="currentChapterIndex")
    current_paragraph_id: Optional[str] = Field(default=None, alias="currentParagraphId")


class SegmentRequest(BaseModel):
    """Request to segment text into paragraphs and sentences."""

    text: str
    language: Optional[str] = "en"


class SegmentResponse(BaseModel):
    """Response containing segmented sentences and paragraphs."""

    model_config = ConfigDict(populate_by_name=True)

    paragraphs: List[str]
    sentences: List[str]
    word_count: int = Field(alias="wordCount")
    estimated_reading_seconds: int = Field(alias="estimatedReadingSeconds")


class ReadingTimeRequest(BaseModel):
    """Request to compute reading time estimate for text or book."""

    model_config = ConfigDict(populate_by_name=True)

    word_count: Optional[int] = Field(default=None, alias="wordCount")
    text: Optional[str] = None
    words_per_minute: int = Field(default=220, alias="wordsPerMinute")


class ReadingTimeResponse(BaseModel):
    """Reading time estimate response."""

    model_config = ConfigDict(populate_by_name=True)

    word_count: int = Field(alias="wordCount")
    words_per_minute: int = Field(alias="wordsPerMinute")
    minutes: int
    seconds: int
    formatted_label: str = Field(alias="formattedLabel")


class ExportPayload(BaseModel):
    """User-controlled payload for exporting and importing reading state."""

    model_config = ConfigDict(populate_by_name=True)

    version: str = "1.0"
    exported_at: str = Field(alias="exportedAt")
    document_id: str = Field(alias="documentId")
    document_title: Optional[str] = Field(default=None, alias="documentTitle")
    notes: List[Note] = Field(default_factory=list)
    bookmarks: List[str] = Field(default_factory=list)
    progress_percent: int = Field(default=0, alias="progressPercent")
