from app.core.config import Settings


def test_generic_debug_environment_variable_is_ignored(monkeypatch):
    monkeypatch.setenv("DEBUG", "release")
    monkeypatch.delenv("BOOKFLOW_DEBUG", raising=False)

    assert Settings().debug is False


def test_namespaced_debug_environment_variable_is_supported(monkeypatch):
    monkeypatch.setenv("BOOKFLOW_DEBUG", "true")

    assert Settings().debug is True


def test_hf_inference_url_configures_modular_service(monkeypatch):
    endpoint_url = "https://example.us-east-1.aws.endpoints.huggingface.cloud"
    monkeypatch.setenv("HF_INFERENCE_URL", endpoint_url)

    assert Settings().hf_inference_url_template == endpoint_url


def test_qwen_is_the_default_remote_ocr_model(monkeypatch):
    monkeypatch.delenv("OCR_MODEL", raising=False)

    assert Settings().ocr_model == "Qwen/Qwen2-VL-7B-Instruct"


def test_remote_ocr_model_can_be_disabled(monkeypatch):
    monkeypatch.setenv("OCR_MODEL", "")

    assert Settings().ocr_model == ""
