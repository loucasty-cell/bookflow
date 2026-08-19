"""Pytest fixtures and test helpers."""

import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.huggingface_ocr import HuggingFaceOCRService


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture
def sample_image_bytes():
    """Generate a small RGB image in memory as bytes."""
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def sample_markdown_content():
    """Sample markdown book text."""
    return """# Chapter 1: The Beginning

This is the first paragraph of the book. It sets the scene.

This is the second paragraph. The adventure begins here.

## The Secret Forest

Deep within the woods, light filtered through the canopy.
Another paragraph about the trees.

# Chapter 2: The Journey

Moving forward into the unknown horizon.
"""
