"""Application configuration settings."""

import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Server settings
    app_name: str = "Bookflow Backend"
    app_version: str = "2.0.0"
    environment: str = "development"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    cors_origins: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Hugging Face Settings for OCR
    hf_token: str = Field(default_factory=lambda: os.getenv("HF_TOKEN", os.getenv("HF_API_KEY", "")))
    hf_api_key: str = Field(default_factory=lambda: os.getenv("HF_TOKEN", os.getenv("HF_API_KEY", "")))
    ocr_model: str = Field(default_factory=lambda: os.getenv("OCR_MODEL", "deepseek-ai/DeepSeek-OCR-2"))
    ocr_engine_url: str = Field(default_factory=lambda: os.getenv("OCR_ENGINE_URL", "http://ocr-engine:8000/v1"))
    hf_ocr_model: str = "deepseek-ai/DeepSeek-OCR-2"
    hf_api_timeout: float = 60.0
    hf_max_retries: int = 3
    hf_inference_url_template: str = "https://api-inference.huggingface.co/models/{model_id}"

    # Recommended HF OCR models list
    available_hf_ocr_models: List[dict] = [
        {
            "id": "deepseek-ai/DeepSeek-OCR-2",
            "name": "DeepSeek-OCR-2",
            "description": "High-throughput visual transformer OCR with structured Markdown formatting.",
            "recommended_for": "Dense 400-600 page books, technical documents, and multi-column layouts.",
        },
        {
            "id": "stepfun-ai/GOT-OCR2_0",
            "name": "GOT-OCR 2.0",
            "description": "General OCR Theory 2.0 model handling plain text, formatting, and tables.",
            "recommended_for": "Full page scans with complex formatting.",
        },
        {
            "id": "microsoft/trocr-large-printed",
            "name": "TrOCR Large (Printed)",
            "description": "High-accuracy transformer OCR optimized for printed book text.",
            "recommended_for": "High-fidelity book pages and dense typography.",
        },
        {
            "id": "microsoft/trocr-base-stage1",
            "name": "TrOCR Base (Stage 1)",
            "description": "Fast and lightweight transformer OCR for printed and handwritten text.",
            "recommended_for": "General single/multi-line text segments and pages.",
        },
        {
            "id": "facebook/nougat-base",
            "name": "Nougat Base",
            "description": "Neural Optical Understanding for Academic Documents (extracts text & formulas).",
            "recommended_for": "Academic papers and technical books.",
        },
    ]

    # Processing Limits
    max_upload_size_mb: int = 500
    max_batch_images: int = 32
    max_pdf_pages_ocr: int = 1000


settings = Settings()
