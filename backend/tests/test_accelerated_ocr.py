import json
import time
import base64

import fitz
import httpx
import pytest
from fastapi.testclient import TestClient

import main as accelerated_ocr


@pytest.mark.asyncio
async def test_hf_provider_preflight_rejects_unhosted_model(monkeypatch):
    monkeypatch.setattr(
        accelerated_ocr,
        "HF_INFERENCE_URL",
        "https://router.huggingface.co/hf-inference/models",
    )

    def handler(request):
        assert request.headers["authorization"] == "Bearer test-token"
        return httpx.Response(200, json={"inferenceProviderMapping": {}})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(ValueError, match="not deployed"):
            await accelerated_ocr.ensure_hf_inference_support(
                client,
                "org/serverless-ocr",
                "test-token",
            )


@pytest.mark.asyncio
async def test_hf_chat_provider_preflight_uses_openai_model_route(monkeypatch):
    monkeypatch.setattr(
        accelerated_ocr,
        "HF_INFERENCE_URL",
        "https://router.huggingface.co/v1/chat/completions",
    )

    def handler(request):
        assert request.url.path == "/v1/models/Qwen/Qwen2-VL-7B-Instruct"
        return httpx.Response(200, json={"id": "Qwen/Qwen2-VL-7B-Instruct", "providers": [{"status": "live"}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        await accelerated_ocr.ensure_hf_inference_support(
            client,
            "Qwen/Qwen2-VL-7B-Instruct",
            "test-token",
        )


def test_qwen_chat_payload_contains_data_url_and_ocr_prompt(monkeypatch):
    monkeypatch.setattr(accelerated_ocr, "OCR_PROMPT", "Extract this page")
    image = b"jpeg-bytes"

    payload = accelerated_ocr.build_hf_chat_payload("Qwen/Qwen2-VL-7B-Instruct", image)

    assert payload["model"] == "Qwen/Qwen2-VL-7B-Instruct"
    assert payload["messages"][0]["content"][0]["text"] == "Extract this page"
    assert base64.b64encode(image).decode("ascii") in payload["messages"][0]["content"][1]["image_url"]["url"]


@pytest.mark.asyncio
async def test_qwen_chat_response_is_parsed(monkeypatch):
    monkeypatch.setattr(accelerated_ocr, "HF_INFERENCE_URL", "https://router.huggingface.co/v1/chat/completions")
    monkeypatch.setattr(accelerated_ocr, "PADDLEOCR_URL", "")

    def handler(request):
        body = json.loads(request.content)
        assert body["model"] == "Qwen/Qwen2-VL-7B-Instruct"
        assert body["messages"][0]["content"][1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
        return httpx.Response(200, json={"choices": [{"message": {"content": "Qwen OCR text"}}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await accelerated_ocr.call_ocr_with_retry(
            client,
            page_number=1,
            image_b64=base64.b64encode(b"jpeg-bytes").decode("ascii"),
            native_text="",
            is_native=False,
            model_id="Qwen/Qwen2-VL-7B-Instruct",
            api_key="test-token",
        )

    assert result.success is True
    assert result.text == "Qwen OCR text"


@pytest.mark.asyncio
async def test_paddleocr_payload_and_response_are_supported(monkeypatch):
    monkeypatch.setattr(accelerated_ocr, "PADDLEOCR_URL", "http://paddle.test/ocr")

    def handler(request):
        body = json.loads(request.content)
        assert body["fileType"] == 1
        assert base64.b64decode(body["file"]) == b"jpeg-bytes"
        return httpx.Response(
            200,
            json={"result": {"ocrResults": [{"prunedResult": "Paddle OCR text"}]}},
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await accelerated_ocr.call_paddleocr(client, 3, b"jpeg-bytes")

    assert result is not None
    assert result.success is True
    assert result.page_number == 3
    assert result.text == "Paddle OCR text"


def test_paddleocr_client_parses_official_nested_result():
    from app.services.paddle_ocr import PaddleOCRClient

    response = {
        "result": {
            "ocrResults": [
                {"prunedResult": "First line"},
                {"prunedResult": "Second line"},
            ]
        }
    }

    assert PaddleOCRClient.parse_response(response) == "First line\nSecond line"


def test_dedicated_hf_endpoint_is_used_without_appending_model(monkeypatch):
    endpoint_url = "https://example.us-east-1.aws.endpoints.huggingface.cloud"
    monkeypatch.setattr(accelerated_ocr, "HF_INFERENCE_URL", endpoint_url)

    assert accelerated_ocr.hf_inference_url_for_model("org/serverless-ocr") == endpoint_url


def test_cors_allows_bookflow_and_rejects_untrusted_origins():
    client = TestClient(accelerated_ocr.app)
    request_headers = {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }

    allowed = client.options(
        "/api/ocr/scan",
        headers={**request_headers, "Origin": "http://localhost:3000"},
    )
    untrusted = client.options(
        "/api/ocr/scan",
        headers={**request_headers, "Origin": "https://untrusted.example"},
    )

    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in untrusted.headers


def test_native_pdf_scan_completes_without_external_inference():
    document = fitz.open()
    page = document.new_page()
    expected_text = (
        "This native PDF page contains enough selectable words to verify the complete "
        "Bookflow OCR upload and streaming pipeline without external inference."
    )
    page.insert_text((72, 72), expected_text)
    pdf_bytes = document.tobytes()
    document.close()

    response = TestClient(accelerated_ocr.app).post(
        "/api/ocr/scan",
        files={"file": ("native.pdf", pdf_bytes, "application/pdf")},
    )
    job_id = response.json()["job_id"]

    try:
        job = accelerated_ocr.jobs[job_id]
        assert response.status_code == 200
        assert job.status == "completed"
        assert job.total_pages == 1
        assert "complete Bookflow OCR upload" in job.markdown
    finally:
        accelerated_ocr.jobs.pop(job_id, None)


def test_completed_job_replays_completion_event():
    job_id = "completed-before-subscribe"
    page = {
        "page_number": 1,
        "text": "Recovered page text",
        "word_count": 3,
        "latency_ms": 1.0,
        "success": True,
        "error": None,
    }
    job = accelerated_ocr.OCRJob(
        job_id=job_id,
        filename="sample.pdf",
        total_pages=1,
        status="completed",
        current_page=1,
        pages=[page],
        markdown="Recovered page text",
        total_words=3,
        completed_at=time.time(),
    )
    accelerated_ocr.jobs[job_id] = job

    try:
        response = TestClient(accelerated_ocr.app).get(f"/api/ocr/progress/{job_id}")
    finally:
        accelerated_ocr.jobs.pop(job_id, None)

    assert response.status_code == 200
    assert "event: completed" in response.text
    completed_data = response.text.split("event: completed\ndata: ", 1)[1].split("\n\n", 1)[0]
    assert json.loads(completed_data)["markdown"] == "Recovered page text"


def test_canceled_job_replays_error_event_without_page_content():
    job_id = "canceled-before-subscribe"
    job = accelerated_ocr.OCRJob(
        job_id=job_id,
        filename="sample.pdf",
        total_pages=1,
        status="canceled",
        error="Scan was canceled by user.",
    )
    accelerated_ocr.jobs[job_id] = job

    try:
        response = TestClient(accelerated_ocr.app).get(f"/api/ocr/progress/{job_id}")
    finally:
        accelerated_ocr.jobs.pop(job_id, None)

    assert response.status_code == 200
    assert "event: error" in response.text
    assert "Scan was canceled by user." in response.text


def test_cancel_endpoint_clears_partial_document_content():
    job_id = "cancel-processing-job"
    job = accelerated_ocr.OCRJob(
        job_id=job_id,
        filename="sample.pdf",
        total_pages=2,
        status="processing",
        current_page=1,
        pages=[{"page_number": 1, "text": "Partial private content"}],
        markdown="Partial private content",
        total_words=3,
    )
    accelerated_ocr.jobs[job_id] = job

    try:
        response = TestClient(accelerated_ocr.app).post(f"/api/ocr/cancel/{job_id}")
    finally:
        accelerated_ocr.jobs.pop(job_id, None)

    assert response.status_code == 200
    assert job.status == "canceled"
    assert job.pages == []
    assert job.markdown == ""
    assert job.total_words == 0
