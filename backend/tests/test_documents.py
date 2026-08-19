"""Tests for document parsing endpoints and service."""

from app.services.document_service import document_service


def test_document_validation():
    valid_res = document_service.validate_file("sample.pdf", 1024 * 1024)
    assert valid_res.valid is True
    assert valid_res.kind == "PDF"

    invalid_res = document_service.validate_file("archive.zip", 1024)
    assert invalid_res.valid is False


def test_parse_markdown_service(sample_markdown_content):
    book = document_service.parse_markdown(sample_markdown_content, "Test Book")
    assert book.title == "Test Book"
    assert book.kind == "MARKDOWN"
    assert len(book.chapters) == 2
    assert book.chapters[0].title == "Chapter 1: The Beginning"
    assert len(book.chapters[0].paragraphs) >= 2


def test_parse_text_service():
    raw_text = "Opening paragraph.\n\nSecond paragraph of the document."
    book = document_service.parse_plain_text(raw_text, "Text Book")
    assert book.kind == "TEXT"
    assert len(book.chapters) == 1
    assert len(book.chapters[0].paragraphs) == 2


def test_parse_endpoint(client, sample_markdown_content):
    files = {
        "file": ("test.md", sample_markdown_content.encode("utf-8"), "text/markdown")
    }
    response = client.post("/api/documents/parse", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["book"]["kind"] == "MARKDOWN"
    assert len(data["book"]["chapters"]) == 2
