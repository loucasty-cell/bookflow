"""Document data models matching Bookflow frontend normalization schemas."""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class Subheading(BaseModel):
    """Optional subheading grouping inside a chapter."""

    title: Optional[str] = None
    paragraphs: List[str] = Field(default_factory=list)


class Paragraph(BaseModel):
    """Enriched paragraph representation for reader."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    text: str
    chapter_index: int = Field(serialization_alias="chapterIndex", validation_alias="chapterIndex")
    paragraph_index: int = Field(serialization_alias="paragraphIndex", validation_alias="paragraphIndex")


class Section(BaseModel):
    """Section structure for enriched chapter view."""

    title: Optional[str] = None
    paragraphs: List[Paragraph] = Field(default_factory=list)


class Chapter(BaseModel):
    """Chapter structure of a normalized book."""

    model_config = ConfigDict(populate_by_name=True)

    title: str
    paragraphs: List[str] = Field(
        default_factory=list,
        description="Flat, document-order list of paragraph text for the chapter.",
    )
    subheadings: Optional[List[Subheading]] = Field(
        default=None,
        description="Optional subheading groups for Markdown and EPUB chapters.",
    )
    focus_eligible: Optional[bool] = Field(
        default=True,
        serialization_alias="focusEligible",
        validation_alias="focusEligible",
        description="Whether this chapter contains body content eligible for automatic reading focus.",
    )


class NormalizedBook(BaseModel):
    """Normalized book schema compatible with Bookflow frontend."""

    title: str
    author: Optional[str] = None
    kind: str = Field(description="Document kind: PDF, EPUB, TEXT, or MARKDOWN")
    chapters: List[Chapter] = Field(default_factory=list)


class ParseResponse(BaseModel):
    """Response returned after parsing a document."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    book: Optional[NormalizedBook] = None
    message: Optional[str] = None
    page_count: Optional[int] = Field(default=None, serialization_alias="pageCount", validation_alias="pageCount")
    word_count: Optional[int] = Field(default=None, serialization_alias="wordCount", validation_alias="wordCount")


class DocumentValidationResponse(BaseModel):
    """Response validating a document file before parsing."""

    model_config = ConfigDict(populate_by_name=True)

    valid: bool
    kind: Optional[str] = None
    file_name: str = Field(serialization_alias="fileName", validation_alias="fileName")
    file_size_bytes: int = Field(serialization_alias="fileSizeBytes", validation_alias="fileSizeBytes")
    error: Optional[str] = None
