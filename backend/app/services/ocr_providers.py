import asyncio
import base64
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Optional
from urllib.parse import quote, urlparse

import httpx

from .ocr_jobs import PageData

logger = logging.getLogger("bookflow.ocr")

MODEL_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*(?:/[A-Za-z0-9][A-Za-z0-9._-]*)?$")
ALLOWED_HF_HOSTS = frozenset({"router.huggingface.co", "huggingface.co"})
HF_ENDPOINT_SUFFIX = ".endpoints.huggingface.cloud"


@dataclass(frozen=True)
class OCRProviderConfig:
    inference_url: str
    hf_token: str
    paddleocr_url: str
    ocr_prompt: str
    hf_max_tokens: int
    max_retries: int = 3


def default_provider_config() -> OCRProviderConfig:
    return OCRProviderConfig(
        inference_url=os.getenv(
            "HF_INFERENCE_URL",
            "https://router.huggingface.co/v1/chat/completions",
        ).rstrip("/"),
        hf_token=os.getenv("HF_TOKEN", os.getenv("HF_API_KEY", "")),
        paddleocr_url=os.getenv("PADDLEOCR_URL", "").strip().rstrip("/"),
        ocr_prompt=os.getenv(
            "OCR_PROMPT",
            "Extract all text from this page exactly as written. Return only the extracted text in Markdown, preserving reading order, headings, tables, and line breaks.",
        ),
        hf_max_tokens=int(os.getenv("HF_MAX_TOKENS", "2048")),
        max_retries=3,
    )


def validate_model_id(model_id: Optional[str]) -> str:
    value = (model_id or "").strip()
    if not value:
        return value
    if len(value) > 200 or not MODEL_ID_PATTERN.fullmatch(value):
        raise ValueError("OCR model ID contains unsupported characters.")
    if any(segment in {".", ".."} for segment in value.split("/")):
        raise ValueError("OCR model ID contains an unsafe path segment.")
    return value


def validate_hf_inference_url(value: Optional[str]) -> str:
    normalized = (value or "").strip()
    if not normalized:
        return normalized
    try:
        parsed = urlparse(normalized)
        port = parsed.port
    except ValueError as exc:
        raise ValueError("HF_INFERENCE_URL is not a valid URL.") from exc
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme.lower() != "https":
        raise ValueError("HF_INFERENCE_URL must use HTTPS.")
    if not hostname or (
        hostname not in ALLOWED_HF_HOSTS and not hostname.endswith(HF_ENDPOINT_SUFFIX)
    ):
        raise ValueError("HF_INFERENCE_URL host is not allowed.")
    if port is not None and port != 443:
        raise ValueError("HF_INFERENCE_URL must use the HTTPS default port.")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("HF_INFERENCE_URL must not contain credentials.")
    if parsed.query or parsed.fragment:
        raise ValueError("HF_INFERENCE_URL must not contain a query or fragment.")
    if normalized.count("{model_id}") > 1 or any(
        marker in normalized.replace("{model_id}", "") for marker in ("{", "}")
    ):
        raise ValueError("HF_INFERENCE_URL contains an invalid model placeholder.")
    return normalized.rstrip("/")


def bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, separator, value = authorization.strip().partition(" ")
    if not separator or scheme.lower() != "bearer":
        return None
    token = value.strip()
    return token or None


async def ensure_hf_inference_support(
    client: httpx.AsyncClient,
    model_id: str,
    api_key: Optional[str] = None,
    *,
    inference_url: str,
    hf_token: str = "",
) -> None:
    validated_model_id = validate_model_id(model_id)
    configured_url = validate_hf_inference_url(inference_url)
    if not validated_model_id:
        raise ValueError(
            "No remote OCR model is configured. Set OCR_MODEL in backend/.env to a "
            "Hugging Face model deployed by the Inference Provider, or use private on-device OCR."
        )

    parsed_url = urlparse(configured_url)
    if parsed_url.hostname == "router.huggingface.co" and parsed_url.path.startswith("/v1"):
        token = (api_key or hf_token or "").strip()
        headers = {"Authorization": f"Bearer {token}"} if token and token != "EMPTY" else {}
        response = await client.get(
            f"https://router.huggingface.co/v1/models/{quote(validated_model_id, safe='/')}",
            headers=headers,
        )
        if response.status_code == 401:
            raise ValueError("Hugging Face rejected the configured API token.")
        if response.status_code == 404:
            raise ValueError(
                f"{validated_model_id} is not currently available through the Hugging Face OpenAI-compatible provider route. "
                "Use a provider-enabled vision model or configure PaddleOCR/dedicated OCR service."
            )
        response.raise_for_status()
        providers = response.json().get("providers") or []
        if providers and not any(provider.get("status") == "live" for provider in providers):
            raise ValueError(f"{validated_model_id} has no live Hugging Face provider at this time.")
        return

    if not (
        parsed_url.hostname == "router.huggingface.co"
        and parsed_url.path.startswith("/hf-inference/models")
    ):
        return

    token = (api_key or hf_token or "").strip()
    headers = {"Authorization": f"Bearer {token}"} if token and token != "EMPTY" else {}
    response = await client.get(
        f"https://huggingface.co/api/models/{quote(validated_model_id, safe='/')}",
        params={"expand[]": "inferenceProviderMapping"},
        headers=headers,
    )
    if response.status_code == 401:
        raise ValueError("Hugging Face rejected the configured API token.")
    response.raise_for_status()
    provider_mapping = response.json().get("inferenceProviderMapping") or {}
    if "hf-inference" not in provider_mapping:
        raise ValueError(
            f"{validated_model_id} is not deployed by the Hugging Face Inference Provider. "
            "Use Bookflow's private on-device OCR, or configure a dedicated compatible OCR endpoint."
        )


def hf_inference_url_for_model(model_id: str, *, inference_url: str) -> str:
    validated_model_id = validate_model_id(model_id)
    configured_url = validate_hf_inference_url(inference_url)
    if not validated_model_id or not configured_url:
        raise ValueError("A remote OCR model and inference URL are required.")
    if "{model_id}" in configured_url:
        return configured_url.replace(
            "{model_id}", quote(validated_model_id, safe="/")
        )
    if configured_url.endswith("/models"):
        return f"{configured_url}/{quote(validated_model_id, safe='/')}"
    return configured_url


def build_hf_chat_payload(
    model_id: str,
    image_bytes: bytes,
    *,
    ocr_prompt: str,
    hf_max_tokens: int,
) -> Dict[str, Any]:
    image_data = base64.b64encode(image_bytes).decode("ascii")
    return {
        "model": model_id,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": ocr_prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                },
            ],
        }],
        "max_tokens": hf_max_tokens,
        "temperature": 0.0,
    }


def parse_hf_chat_response(response_data: Any) -> str:
    if isinstance(response_data, dict) and isinstance(response_data.get("choices"), list):
        choices = response_data["choices"]
        if choices and isinstance(choices[0], dict):
            message = choices[0].get("message") or {}
            content = message.get("content") if isinstance(message, dict) else None
            if isinstance(content, str):
                return content.strip()
            if isinstance(content, list):
                return "\n".join(
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict) and part.get("type") == "text"
                ).strip()
    if isinstance(response_data, dict):
        return str(response_data.get("generated_text") or response_data.get("text") or "").strip()
    return ""


async def call_paddleocr(
    client: httpx.AsyncClient,
    page_number: int,
    image_bytes: bytes,
    ocr_profile: str = "small",
    *,
    paddleocr_url: str,
) -> Optional[PageData]:
    if not paddleocr_url:
        return None
    started = time.perf_counter()
    profiles = ["medium"] if ocr_profile == "medium" else ["small", "medium"]
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    for profile in profiles:
        try:
            response = await client.post(
                paddleocr_url,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                json={"file": encoded_image, "fileType": 1, "profile": profile},
            )
            if response.status_code != 200:
                logger.warning(
                    "[Page %s] PaddleOCR %s profile returned HTTP %s",
                    page_number,
                    profile,
                    response.status_code,
                )
                continue
            raw_result = response.json()
            extracted_text = ""
            if isinstance(raw_result, dict):
                result = raw_result.get("result") or {}
                ocr_results = result.get("ocrResults") if isinstance(result, dict) else None
                if isinstance(ocr_results, list):
                    extracted_text = "\n".join(
                        str(item.get("prunedResult") or item.get("markdownText") or "")
                        for item in ocr_results
                        if isinstance(item, dict)
                    ).strip()
                else:
                    extracted_text = str(raw_result.get("markdown") or raw_result.get("text") or "").strip()
            elif isinstance(raw_result, list):
                extracted_text = "\n".join(
                    str(item.get("text", "") if isinstance(item, dict) else item)
                    for item in raw_result
                ).strip()
            if extracted_text:
                return PageData(
                    page_number=page_number,
                    text=extracted_text,
                    word_count=len(extracted_text.split()),
                    latency_ms=round((time.perf_counter() - started) * 1000, 2),
                    success=True,
                )
        except Exception as exc:
            logger.warning(
                "[Page %s] PaddleOCR %s profile request failed: %s",
                page_number,
                profile,
                exc,
            )
    return None


async def call_ocr_with_retry(
    client: httpx.AsyncClient,
    page_number: int,
    image_b64: Optional[str],
    native_text: str,
    is_native: bool,
    model_id: str,
    api_key: Optional[str] = None,
    ocr_profile: str = "small",
    *,
    config: Optional[OCRProviderConfig] = None,
    paddle_call: Optional[Callable[..., Awaitable[Optional[PageData]]]] = None,
) -> PageData:
    active_config = config or default_provider_config()
    start_time = time.perf_counter()

    if is_native and native_text and len(native_text.split()) >= 15:
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return PageData(
            page_number=page_number,
            text=native_text,
            word_count=len(native_text.split()),
            latency_ms=latency,
            success=True,
        )

    if not image_b64:
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return PageData(
            page_number=page_number,
            text=native_text or "",
            word_count=len(native_text.split()) if native_text else 0,
            latency_ms=latency,
            success=bool(native_text),
        )

    token = (api_key or active_config.hf_token or "").strip()
    last_error: Optional[str] = None
    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception as exc:
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return PageData(
            page_number=page_number,
            text=native_text or "",
            word_count=len(native_text.split()) if native_text else 0,
            latency_ms=latency,
            success=False,
            error=f"Invalid page image encoding: {exc}",
        )

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Bookflow-OCR-Client/1.0",
    }
    if token and token != "EMPTY":
        headers["Authorization"] = f"Bearer {token}"

    if paddle_call is None:
        paddle_result = await call_paddleocr(
            client,
            page_number,
            image_bytes,
            ocr_profile,
            paddleocr_url=active_config.paddleocr_url,
        )
    else:
        paddle_result = await paddle_call(
            client,
            page_number,
            image_bytes,
            ocr_profile,
        )
    if paddle_result:
        return paddle_result

    if not model_id.strip():
        return PageData(
            page_number=page_number,
            text="",
            word_count=0,
            latency_ms=round((time.perf_counter() - start_time) * 1000, 2),
            success=False,
            error="PaddleOCR returned no text and no Hugging Face OCR model is configured.",
        )

    target_url = hf_inference_url_for_model(
        model_id,
        inference_url=active_config.inference_url,
    )
    payload = build_hf_chat_payload(
        model_id,
        image_bytes,
        ocr_prompt=active_config.ocr_prompt,
        hf_max_tokens=active_config.hf_max_tokens,
    )

    for attempt in range(1, active_config.max_retries + 1):
        try:
            response = await client.post(
                target_url,
                headers=headers,
                json=payload,
            )

            if response.status_code == 200:
                raw_result = response.json()
                extracted_text = parse_hf_chat_response(raw_result)
                if not extracted_text:
                    raise ValueError("Hugging Face returned no OCR text.")

                latency = round((time.perf_counter() - start_time) * 1000, 2)
                return PageData(
                    page_number=page_number,
                    text=extracted_text,
                    word_count=len(extracted_text.split()),
                    latency_ms=latency,
                    success=True,
                )

            if response.status_code == 503:
                try:
                    info = response.json()
                    estimated_wait = min(float(info.get("estimated_time", 5.0)), 25.0)
                except Exception:
                    estimated_wait = 5.0
                logger.info(
                    "[Page %s] Model loading on Hugging Face. Waiting %ss (attempt %s/%s).",
                    page_number,
                    estimated_wait,
                    attempt,
                    active_config.max_retries,
                )
                await asyncio.sleep(estimated_wait)
                continue

            if response.status_code == 401:
                raise ValueError(
                    "Hugging Face API returned 401 Unauthorized. Please verify HF_TOKEN."
                )

            if response.status_code == 429:
                wait_time = 2.0 * attempt
                logger.warning("[Page %s] HF rate limited. Waiting %ss.", page_number, wait_time)
                await asyncio.sleep(wait_time)
                continue

            detail = response.text[:200]
            raise ValueError(f"Hugging Face API returned status {response.status_code}: {detail}")
        except Exception as exc:
            last_error = str(exc)
            logger.warning(
                "[Page %s] Attempt %s/%s (%s) failed: %s",
                page_number,
                attempt,
                active_config.max_retries,
                target_url,
                exc,
            )
            if any(code in last_error for code in ("400", "401", "403", "404")):
                break
        if attempt < active_config.max_retries:
            await asyncio.sleep(0.5 * (2 ** (attempt - 1)))

    latency = round((time.perf_counter() - start_time) * 1000, 2)
    if native_text and len(native_text.split()) >= 3:
        logger.info("[Page %s] Falling back to native selectable text extraction.", page_number)
        return PageData(
            page_number=page_number,
            text=native_text,
            word_count=len(native_text.split()),
            latency_ms=latency,
            success=True,
            error=f"HF fallback: {last_error}",
        )

    return PageData(
        page_number=page_number,
        text="",
        word_count=0,
        latency_ms=latency,
        success=False,
        error=last_error or "OCR processing failed after retries.",
    )
