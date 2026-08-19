"""OCR request and response data models."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class OCRPageResult(BaseModel):
    """OCR result for a single page or image."""

    model_config = ConfigDict(populate_by_name=True)

    page_number: int = Field(default=1, alias="pageNumber")
    text: str = Field(description="Extracted plain text")
    paragraphs: List[str] = Field(
        default_factory=list,
        description="Paragraphs extracted from the OCR text",
    )
    confidence: Optional[float] = Field(
        default=None,
        description="Confidence score if provided by model (0.0 - 1.0)",
    )
    model_used: str = Field(alias="modelUsed", description="Model ID used for inference")
    latency_ms: Optional[float] = Field(default=None, alias="latencyMs")
    success: bool = True
    error: Optional[str] = None


class OCRDocumentResponse(BaseModel):
    """Result of full document OCR scanning."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    title: Optional[str] = None
    pages: List[OCRPageResult] = Field(default_factory=list)
    total_pages: int = Field(alias="totalPages")
    successful_pages: int = Field(alias="successfulPages")
    failed_pages: int = Field(alias="failedPages")
    total_word_count: int = Field(alias="totalWordCount")
    total_latency_ms: float = Field(alias="totalLatencyMs")
    model_used: str = Field(alias="modelUsed")
    error: Optional[str] = None


class OCRBatchResponse(BaseModel):
    """Batch OCR processing result for multiple images."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    results: List[OCRPageResult] = Field(default_factory=list)
    total_images: int = Field(alias="totalImages")
    model_used: str = Field(alias="modelUsed")
    total_latency_ms: float = Field(alias="totalLatencyMs")


class HFModelInfo(BaseModel):
    """Information about an available Hugging Face OCR model."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    description: str
    recommended_for: str = Field(alias="recommendedFor")


class OCRModelListResponse(BaseModel):
    """Response containing available and default OCR models."""

    model_config = ConfigDict(populate_by_name=True)

    default_model: str = Field(alias="defaultModel")
    hf_token_configured: bool = Field(alias="hfTokenConfigured")
    available_models: List[HFModelInfo] = Field(alias="availableModels")


class OCRStatusResponse(BaseModel):
    """Status of background OCR processing task."""

    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(alias="taskId")
    status: str = Field(description="pending, processing, completed, or failed")
    progress_percent: int = Field(default=0, alias="progressPercent")
    current_page: int = Field(default=0, alias="currentPage")
    total_pages: int = Field(default=0, alias="totalPages")
    result: Optional[OCRDocumentResponse] = None
    error: Optional[str] = None
