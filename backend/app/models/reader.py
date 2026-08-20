"""Reader models for notes, bookmarks, segmentation, and state management."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class Note(BaseModel):
    """A reader margin note attached to a paragraph."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    paragraph_id: str = Field(serialization_alias="paragraphId", validation_alias="paragraphId")
    quote: str = Field(description="Paragraph excerpt")
    text: str = Field(description="Reader note content")
    created_at: Optional[str] = Field(default=None, serialization_alias="createdAt", validation_alias="createdAt")


class Bookmark(BaseModel):
    """A saved bookmark reference."""

    model_config = ConfigDict(populate_by_name=True)

    paragraph_id: str = Field(serialization_alias="paragraphId", validation_alias="paragraphId")
    chapter_index: Optional[int] = Field(default=None, serialization_alias="chapterIndex", validation_alias="chapterIndex")
    title: Optional[str] = None


class ReadingProgress(BaseModel):
    """Reading progress state for a book."""

    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(serialization_alias="documentId", validation_alias="documentId")
    progress_percent: int = Field(serialization_alias="progressPercent", validation_alias="progressPercent")
    scroll_top: int = Field(serialization_alias="scrollTop", validation_alias="scrollTop")
    current_chapter_index: int = Field(default=0, serialization_alias="currentChapterIndex", validation_alias="currentChapterIndex")
    current_paragraph_id: Optional[str] = Field(default=None, serialization_alias="currentParagraphId", validation_alias="currentParagraphId")


class SegmentRequest(BaseModel):
    """Request to segment text into paragraphs and sentences."""

    text: str
    language: Optional[str] = "en"


class SegmentResponse(BaseModel):
    """Response containing segmented sentences and paragraphs."""

    model_config = ConfigDict(populate_by_name=True)

    paragraphs: List[str]
    sentences: List[str]
    word_count: int = Field(serialization_alias="wordCount", validation_alias="wordCount")
    estimated_reading_seconds: int = Field(serialization_alias="estimatedReadingSeconds", validation_alias="estimatedReadingSeconds")


class ReadingTimeRequest(BaseModel):
    """Request to compute reading time estimate for text or book."""

    model_config = ConfigDict(populate_by_name=True)

    word_count: Optional[int] = Field(default=None, serialization_alias="wordCount", validation_alias="wordCount")
    text: Optional[str] = None
    words_per_minute: int = Field(default=220, serialization_alias="wordsPerMinute", validation_alias="wordsPerMinute")


class ReadingTimeResponse(BaseModel):
    """Reading time estimate response."""

    model_config = ConfigDict(populate_by_name=True)

    word_count: int = Field(serialization_alias="wordCount", validation_alias="wordCount")
    words_per_minute: int = Field(serialization_alias="wordsPerMinute", validation_alias="wordsPerMinute")
    minutes: int
    seconds: int
    formatted_label: str = Field(serialization_alias="formattedLabel", validation_alias="formattedLabel")


class ExportPayload(BaseModel):
    """User-controlled payload for exporting and importing reading state."""

    model_config = ConfigDict(populate_by_name=True)

    version: str = "1.0"
    exported_at: str = Field(serialization_alias="exportedAt", validation_alias="exportedAt")
    document_id: str = Field(serialization_alias="documentId", validation_alias="documentId")
    document_title: Optional[str] = Field(default=None, serialization_alias="documentTitle", validation_alias="documentTitle")
    notes: List[Note] = Field(default_factory=list)
    bookmarks: List[str] = Field(default_factory=list)
    progress_percent: int = Field(default=0, serialization_alias="progressPercent", validation_alias="progressPercent")
