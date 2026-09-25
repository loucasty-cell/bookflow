"""Tests for the opt-in reading lens endpoint contract, bounds, consent, and provider fallback."""

import json
from typing import Any, Callable, Dict, List

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.routers import reader as reader_router

LENS_URL = "/api/reading-lens"
PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-2.5-flash-lite"
TEST_KEY = "test-gemini-key"
OMIT = object()

Handler = Callable[[httpx.Request], httpx.Response]


@pytest.fixture(autouse=True)
def lens_env(monkeypatch):
    reader_router.reset_lens_rate_limits()
    monkeypatch.setattr(settings, "gemini_api_key", TEST_KEY)
    monkeypatch.setattr(settings, "gemini_model", PRIMARY_MODEL)
    monkeypatch.setattr(settings, "gemini_fallback_model", FALLBACK_MODEL)
    monkeypatch.setattr(
        settings, "gemini_base_url", "https://generativelanguage.googleapis.com/v1beta"
    )
    yield
    reader_router.reset_lens_rate_limits()


class FakeProvider:
    """Captures outgoing requests and replays canned upstream responses."""

    def __init__(self, handler: Handler) -> None:
        self.handler = handler
        self.requests: List[httpx.Request] = []

    def install(self, monkeypatch: pytest.MonkeyPatch) -> "FakeProvider":
        def factory() -> httpx.AsyncClient:
            async def dispatch(request: httpx.Request) -> httpx.Response:
                self.requests.append(request)
                return self.handler(request)

            return httpx.AsyncClient(transport=httpx.MockTransport(dispatch))

        monkeypatch.setattr(reader_router, "_build_http_client", factory)
        return self

    @property
    def models(self) -> List[str]:
        return [
            request.url.path.split("/models/", 1)[-1].split(":", 1)[0]
            for request in self.requests
        ]


def sse_body(chunks: List[Dict[str, Any]]) -> bytes:
    return "".join(f"data: {json.dumps(chunk)}\n\n" for chunk in chunks).encode("utf-8")


def text_chunks(*pieces: str, finish: str = "STOP") -> bytes:
    chunks: List[Dict[str, Any]] = [
        {"candidates": [{"content": {"parts": [{"text": piece}]}}]} for piece in pieces
    ]
    chunks.append({"candidates": [{"content": {"parts": []}, "finishReason": finish}]})
    return sse_body(chunks)


def events(response_text: str) -> List[Dict[str, Any]]:
    parsed: List[Dict[str, Any]] = []
    for block in response_text.split("\n\n"):
        if not block.strip():
            continue
        lines = block.splitlines()
        assert lines[0].startswith("event: ")
        assert lines[1].startswith("data: ")
        parsed.append(
            {
                "event": lines[0][len("event: ") :],
                "data": json.loads(lines[1][len("data: ") :]),
            }
        )
    return parsed


def lens_request(**overrides: Any) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "prompt": "Explain the core idea of this passage.",
        "passage": "A short passage the reader selected.",
        "action": "explain",
        "consent": True,
    }
    payload.update(overrides)
    return {key: value for key, value in payload.items() if value is not OMIT}


def ok_provider(monkeypatch: pytest.MonkeyPatch, *pieces: str) -> FakeProvider:
    return FakeProvider(
        lambda request: httpx.Response(200, content=text_chunks(*pieces or ("ok",)))
    ).install(monkeypatch)


def test_requires_explicit_consent_before_any_remote_call(client, monkeypatch):
    provider = ok_provider(monkeypatch)

    for payload in (lens_request(consent=False), lens_request(consent=OMIT)):
        response = client.post(LENS_URL, json=payload)

        assert response.status_code == 403
        assert "consent" in response.json()["detail"].lower()
    assert provider.requests == []


def test_rejects_null_passage(client, monkeypatch):
    provider = ok_provider(monkeypatch)

    response = client.post(
        LENS_URL, json={"prompt": "Summarize", "passage": None, "consent": True}
    )

    assert response.status_code == 422
    assert provider.requests == []


def test_rejects_oversized_prompt_and_passage(client):
    oversized_prompt = client.post(
        LENS_URL,
        json={"prompt": "x" * (reader_router.LENS_MAX_PROMPT_CHARS + 1), "consent": True},
    )
    oversized_passage = client.post(
        LENS_URL,
        json={
            "prompt": "Summarize",
            "passage": "y" * (reader_router.LENS_MAX_PASSAGE_CHARS + 1),
            "consent": True,
        },
    )

    assert oversized_prompt.status_code == 422
    assert oversized_passage.status_code == 422


def test_rejects_unknown_action_and_unknown_fields(client):
    bad_action = client.post(
        LENS_URL, json={"prompt": "Summarize", "action": "rewrite-everything", "consent": True}
    )
    extra_field = client.post(
        LENS_URL, json={"prompt": "Summarize", "consent": True, "apiKey": "leaked"}
    )

    assert bad_action.status_code == 422
    assert extra_field.status_code == 422


def test_returns_503_when_provider_is_not_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")

    response = client.post(LENS_URL, json=lens_request())

    assert response.status_code == 503
    assert response.json()["detail"] == "Reading lens is not configured on this server."
    assert "text" not in response.json()
    assert "Reading Lens Summary" not in response.text


def test_returns_503_when_model_chain_is_empty(client, monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", "")
    monkeypatch.setattr(settings, "gemini_fallback_model", "   ")

    response = client.post(LENS_URL, json=lens_request())

    assert response.status_code == 503


def test_streams_sse_contract_with_key_in_header(client, monkeypatch):
    provider = ok_provider(monkeypatch, "Hello ", "world")

    response = client.post(LENS_URL, json=lens_request())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "no-store" in response.headers["cache-control"]
    assert response.headers["x-accel-buffering"] == "no"

    stream = events(response.text)
    assert [item["event"] for item in stream] == ["start", "delta", "delta", "completed"]
    assert [item["data"]["text"] for item in stream[1:3]] == ["Hello ", "world"]
    assert stream[0]["data"]["candidates"] == [PRIMARY_MODEL, FALLBACK_MODEL]
    assert stream[-1]["data"]["text"] == "Hello world"
    assert stream[-1]["data"]["model"] == PRIMARY_MODEL
    assert stream[-1]["data"]["fallbackUsed"] is False
    assert stream[-1]["data"]["attempts"] == [PRIMARY_MODEL]
    assert stream[-1]["data"]["finishReason"] == "STOP"

    request = provider.requests[0]
    assert request.headers["x-goog-api-key"] == TEST_KEY
    assert "key=" not in str(request.url)
    assert "x-goog-api-key" not in set(request.url.params.keys())
    body = json.loads(request.content)
    assert "A short passage the reader selected." in body["contents"][0]["parts"][0]["text"]
    assert body["generationConfig"]["maxOutputTokens"] == settings.reading_lens_max_output_tokens


def test_falls_back_to_flash_lite_when_primary_fails(client, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if "flash-lite" not in request.url.path:
            return httpx.Response(429, json={"error": {"message": "quota exhausted"}})
        return httpx.Response(200, content=text_chunks("Recovered by lite"))

    provider = FakeProvider(handler).install(monkeypatch)

    response = client.post(LENS_URL, json=lens_request())

    assert response.status_code == 200
    stream = events(response.text)
    assert provider.models == [PRIMARY_MODEL, FALLBACK_MODEL]
    assert stream[-1]["event"] == "completed"
    assert stream[-1]["data"]["model"] == FALLBACK_MODEL
    assert stream[-1]["data"]["fallbackUsed"] is True
    assert stream[-1]["data"]["attempts"] == [PRIMARY_MODEL, FALLBACK_MODEL]
    assert stream[-1]["data"]["text"] == "Recovered by lite"


def test_falls_back_when_primary_returns_no_text(client, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if "flash-lite" not in request.url.path:
            return httpx.Response(200, content=sse_body([{"candidates": []}]))
        return httpx.Response(200, content=text_chunks("Lite answered"))

    FakeProvider(handler).install(monkeypatch)

    response = client.post(LENS_URL, json=lens_request())

    stream = events(response.text)
    assert stream[-1]["event"] == "completed"
    assert stream[-1]["data"]["model"] == FALLBACK_MODEL


def test_reports_error_when_every_model_fails(client, monkeypatch):
    provider = FakeProvider(
        lambda request: httpx.Response(503, content=b'{"error": {"message": "upstream down"}}')
    ).install(monkeypatch)

    response = client.post(LENS_URL, json=lens_request())

    assert response.status_code == 200
    stream = events(response.text)
    assert stream[-1]["event"] == "error"
    assert stream[-1]["data"]["code"] == "provider_unavailable"
    assert stream[-1]["data"]["attempts"] == [PRIMARY_MODEL, FALLBACK_MODEL]
    assert provider.models == [PRIMARY_MODEL, FALLBACK_MODEL]


def test_redacts_upstream_error_text(client, monkeypatch):
    secret = "AIzaSySUPER-SECRET-KEY-1234"
    upstream_body = json.dumps(
        {"error": {"code": 500, "message": f"invalid key {secret} for project owner-42"}}
    ).encode("utf-8")

    FakeProvider(
        lambda request: httpx.Response(500, content=upstream_body, headers={"x-request-id": secret})
    ).install(monkeypatch)

    response = client.post(LENS_URL, json=lens_request())

    assert response.status_code == 200
    assert secret not in response.text
    assert "owner-42" not in response.text
    assert "invalid key" not in response.text
    assert TEST_KEY not in response.text
    final = events(response.text)[-1]
    assert final["event"] == "error"
    assert set(final["data"]) == {"error", "code", "attempts"}


def test_transport_failure_is_redacted(client, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection to 10.0.0.5:443 refused with token abc123")

    FakeProvider(handler).install(monkeypatch)

    response = client.post(LENS_URL, json=lens_request())

    final = events(response.text)[-1]
    assert final["event"] == "error"
    assert final["data"]["code"] == "provider_unavailable"
    assert "10.0.0.5" not in response.text
    assert "abc123" not in response.text


def test_timeout_is_redacted(client, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("read timeout on generativelanguage.googleapis.com")

    FakeProvider(handler).install(monkeypatch)

    response = client.post(LENS_URL, json=lens_request())

    final = events(response.text)[-1]
    assert final["event"] == "error"
    assert final["data"]["code"] == "provider_unavailable"
    assert "read timeout" not in response.text


def test_does_not_fall_back_after_partial_stream(client, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if "flash-lite" not in request.url.path:
            return httpx.Response(
                200,
                content=sse_body(
                    [
                        {"candidates": [{"content": {"parts": [{"text": "Partial "}]}}]},
                        {"candidates": [{"content": {"parts": []}, "finishReason": "SAFETY"}]},
                    ]
                ),
            )
        return httpx.Response(200, content=text_chunks("Should not be used"))

    provider = FakeProvider(handler).install(monkeypatch)

    response = client.post(LENS_URL, json=lens_request())

    stream = events(response.text)
    assert provider.models == [PRIMARY_MODEL]
    assert stream[-1]["event"] == "completed"
    assert stream[-1]["data"]["text"] == "Partial "
    assert stream[-1]["data"]["finishReason"] == "SAFETY"


def test_rate_limit_rejects_and_reports_retry_after(client, monkeypatch):
    monkeypatch.setattr(settings, "reading_lens_rate_limit_max", 2)
    ok_provider(monkeypatch)

    assert client.post(LENS_URL, json=lens_request()).status_code == 200
    assert client.post(LENS_URL, json=lens_request()).status_code == 200
    blocked = client.post(LENS_URL, json=lens_request())

    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) > 0
    assert TEST_KEY not in blocked.text


def test_rate_limit_state_is_bounded_and_pruned(monkeypatch):
    monkeypatch.setattr(settings, "reading_lens_max_tracked_clients", 4)
    monkeypatch.setattr(settings, "reading_lens_rate_limit_window_seconds", 10)
    now = 1000.0

    for index in range(50):
        reader_router._consume_lens_quota(f"client-{index}", now + index * 0.01)

    assert len(reader_router._lens_rate_limits) <= 4

    reader_router._consume_lens_quota("client-0", now + 500.0)

    assert len(reader_router._lens_rate_limits) == 1
    assert "client-0" in reader_router._lens_rate_limits


def test_rate_limit_entries_expire_inside_the_window(monkeypatch):
    monkeypatch.setattr(settings, "reading_lens_rate_limit_max", 1)
    monkeypatch.setattr(settings, "reading_lens_rate_limit_window_seconds", 10)

    reader_router._consume_lens_quota("client-a", 100.0)
    with pytest.raises(HTTPException) as blocked:
        reader_router._consume_lens_quota("client-a", 105.0)
    remaining = reader_router._consume_lens_quota("client-a", 112.0)

    assert blocked.value.status_code == 429
    assert remaining == 0


def test_insecure_base_url_is_rejected(client, monkeypatch):
    monkeypatch.setattr(
        settings, "gemini_base_url", "http://generativelanguage.googleapis.com/v1beta"
    )

    response = client.post(LENS_URL, json=lens_request())

    assert response.status_code == 500
    assert "config" in response.json()["detail"].lower()


def test_omitted_passage_is_accepted(client, monkeypatch):
    provider = ok_provider(monkeypatch, "Answered without passage")

    response = client.post(LENS_URL, json={"prompt": "What is Bookflow?", "consent": True})

    assert response.status_code == 200
    body = json.loads(provider.requests[0].content)
    assert "What is Bookflow?" in body["contents"][0]["parts"][0]["text"]


def test_duplicate_models_are_deduplicated_in_the_chain(monkeypatch):
    monkeypatch.setattr(settings, "gemini_model", PRIMARY_MODEL)
    monkeypatch.setattr(settings, "gemini_fallback_model", PRIMARY_MODEL)

    assert reader_router._lens_model_chain() == [PRIMARY_MODEL]
