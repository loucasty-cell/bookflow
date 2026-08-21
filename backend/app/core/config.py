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
    debug: bool = Field(default=False, validation_alias="BOOKFLOW_DEBUG")
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    cors_origins: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("ocr_model", mode="before")
    @classmethod
    def normalize_ocr_model(cls, v: str) -> str:
        return (v or "").strip()

    # Hugging Face Settings for OCR
    hf_token: str = Field(default_factory=lambda: os.getenv("HF_TOKEN", os.getenv("HF_API_KEY", "")))
    hf_api_key: str = Field(default_factory=lambda: os.getenv("HF_TOKEN", os.getenv("HF_API_KEY", "")))
    ocr_model: str = Field(default="", validation_alias="OCR_MODEL")
    ocr_engine_url: str = Field(default_factory=lambda: os.getenv("OCR_ENGINE_URL", "http://ocr-engine:8000/v1"))
    hf_api_timeout: float = 60.0
    hf_max_retries: int = 3
    hf_inference_url_template: str = Field(
        default="https://router.huggingface.co/hf-inference/models/{model_id}",
        validation_alias="HF_INFERENCE_URL",
    )

    # Processing Limits
    max_upload_size_mb: int = 500
    max_batch_images: int = 32
    max_pdf_pages_ocr: int = 1000


settings = Settings()
