import asyncio
import base64
import binascii
import io
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, Literal

import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field


OCR_PROFILES = {
    "small": {
        "detector": "PP-OCRv6_small_det",
        "recognizer": "PP-OCRv6_small_rec",
    },
    "medium": {
        "detector": "PP-OCRv6_medium_det",
        "recognizer": "PP-OCRv6_medium_rec",
    },
}
MAX_IMAGE_BYTES = int(os.getenv("OCR_MAX_IMAGE_MB", "20")) * 1024 * 1024
OCR_DEVICE = os.getenv("OCR_DEVICE", "cpu").strip() or "cpu"
PRELOAD_PROFILES = {
    profile.strip()
    for profile in os.getenv("OCR_PRELOAD_PROFILES", "small").split(",")
    if profile.strip() in OCR_PROFILES
}

pipelines: dict[str, Any] = {}
pipeline_locks = {profile: asyncio.Lock() for profile in OCR_PROFILES}


class OCRRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file: str
    file_type: int = Field(default=1, validation_alias="fileType", serialization_alias="fileType")
    profile: Literal["small", "medium"] = "small"


def create_pipeline(profile: str) -> Any:
    from paddleocr import PaddleOCR

    models = OCR_PROFILES[profile]
    return PaddleOCR(
        text_detection_model_name=models["detector"],
        text_recognition_model_name=models["recognizer"],
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=True,
        device=OCR_DEVICE,
    )


def prediction_texts(value: Any) -> list[str]:
    if isinstance(value, dict):
        rec_texts = value.get("rec_texts")
        if isinstance(rec_texts, list):
            return [str(text).strip() for text in rec_texts if str(text).strip()]
        for nested in value.values():
            texts = prediction_texts(nested)
            if texts:
                return texts
    if isinstance(value, list):
        for nested in value:
            texts = prediction_texts(nested)
            if texts:
                return texts
    return []


def run_prediction(profile: str, image: np.ndarray) -> str:
    output = pipelines[profile].predict(image)
    lines: list[str] = []
    for result in output:
        lines.extend(prediction_texts(result.json))
    return "\n".join(lines).strip()


async def ensure_pipeline(profile: str) -> None:
    if profile in pipelines:
        return
    async with pipeline_locks[profile]:
        if profile not in pipelines:
            pipelines[profile] = await asyncio.to_thread(create_pipeline, profile)


async def recognize(profile: str, image: np.ndarray) -> str:
    await ensure_pipeline(profile)
    async with pipeline_locks[profile]:
        return await asyncio.to_thread(run_prediction, profile, image)


@asynccontextmanager
async def lifespan(_: FastAPI):
    for profile in sorted(PRELOAD_PROFILES):
        await ensure_pipeline(profile)
    yield
    pipelines.clear()


app = FastAPI(title="Bookflow PaddleOCR Worker", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "healthy",
        "device": OCR_DEVICE,
        "loadedProfiles": sorted(pipelines),
        "availableProfiles": OCR_PROFILES,
    }


@app.post("/ocr")
async def ocr(request: OCRRequest) -> dict[str, Any]:
    if request.file_type != 1:
        raise HTTPException(status_code=400, detail="Only base64-encoded image input is supported.")
    try:
        image_bytes = base64.b64decode(request.file, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="The image is not valid base64 data.") from exc
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="The decoded image is empty or exceeds the configured limit.")
    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            image = np.asarray(source.convert("RGB"))
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="The uploaded data is not a readable image.") from exc

    text = await recognize(request.profile, image)
    models = OCR_PROFILES[request.profile]
    return {
        "logId": str(uuid.uuid4()),
        "errorCode": 0,
        "errorMsg": "Success",
        "result": {
            "ocrResults": [{
                "prunedResult": text,
                "profile": request.profile,
                "detectionModel": models["detector"],
                "recognitionModel": models["recognizer"],
            }]
        },
    }
