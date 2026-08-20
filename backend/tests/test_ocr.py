"""Tests for Hugging Face OCR service and endpoints."""

from unittest.mock import AsyncMock, patch
from app.services.huggingface_ocr import HuggingFaceOCRService, hf_ocr_service
from app.models.ocr import OCRPageResult


def test_ocr_models_list_endpoint(client):
    response = client.get("/api/ocr/models")
    assert response.status_code == 200
    data = response.json()
    assert "defaultModel" in data
    assert "availableModels" in data
    assert len(data["availableModels"]) > 0


def test_hf_response_parsing():
    service = HuggingFaceOCRService()

    # List format
    res1 = service.parse_hf_response([{"generated_text": "Extracted text sample."}])
    assert res1 == "Extracted text sample."

    # Dict format
    res2 = service.parse_hf_response({"text": "Another extracted text sample."})
    assert res2 == "Another extracted text sample."


@patch.object(HuggingFaceOCRService, "scan_image_bytes", new_callable=AsyncMock)
def test_ocr_image_endpoint(mock_scan, client, sample_image_bytes):
    mock_scan.return_value = OCRPageResult(
        page_number=1,
        text="Chapter 1. A beginning in the dark.",
        paragraphs=["Chapter 1.", "A beginning in the dark."],
        model_used="microsoft/trocr-base-stage1",
        latency_ms=120.5,
        success=True,
    )

    files = {
        "file": ("page1.jpg", sample_image_bytes, "image/jpeg")
    }
    response = client.post("/api/ocr/image", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["text"] == "Chapter 1. A beginning in the dark."
    assert len(data["paragraphs"]) == 2
