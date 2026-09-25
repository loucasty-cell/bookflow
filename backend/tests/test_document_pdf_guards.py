"""Tests for PDF parsing guards: password-protected files and empty selectable text."""

import fitz
import pytest

from app.services.document_service import (
    DocumentPasswordRequired,
    DocumentService,
    document_service,
)

READABLE_TEXT = (
    "This native PDF page contains enough selectable words to verify the guarded "
    "Bookflow PDF parser end to end."
)
LOCKED_TEXT = "Secret content inside an encrypted pdf document."


def _readable_pdf() -> bytes:
    doc = fitz.open()
    try:
        doc.new_page().insert_text((72, 72), READABLE_TEXT)
        return doc.tobytes()
    finally:
        doc.close()


def _locked_pdf() -> bytes:
    doc = fitz.open()
    try:
        doc.new_page().insert_text((72, 72), LOCKED_TEXT)
        return doc.tobytes(
            encryption=getattr(fitz, "PDF_ENCRYPT_AES_256"),
            owner_pw="owner-secret",
            user_pw="user-secret",
        )
    finally:
        doc.close()


def _blank_pdf() -> bytes:
    doc = fitz.open()
    try:
        doc.new_page()
        return doc.tobytes()
    finally:
        doc.close()


def test_readable_pdf_still_parses():
    result = document_service.parse_document_file(_readable_pdf(), "readable.pdf", "PDF")

    assert result.success is True
    assert result.book is not None
    assert result.word_count and result.word_count > 0
    assert READABLE_TEXT[:20] in result.book.chapters[0].paragraphs[0]


def test_password_protected_pdf_raises_instead_of_empty_success():
    with pytest.raises(DocumentPasswordRequired) as raised:
        DocumentService.parse_pdf(_locked_pdf(), "locked.pdf")

    assert "password-protected" in str(raised.value)


def test_password_protected_pdf_reports_parse_failure():
    result = document_service.parse_document_file(_locked_pdf(), "locked.pdf", "PDF")

    assert result.success is False
    assert result.book is None
    assert result.message is not None
    assert "password-protected" in result.message


def test_password_protected_pdf_is_rejected_by_the_endpoint(client):
    response = client.post(
        "/api/documents/parse",
        files={"file": ("locked.pdf", _locked_pdf(), "application/pdf")},
    )

    assert response.status_code == 422
    assert "password-protected" in response.json()["detail"]


def test_pdf_without_selectable_text_is_not_reported_as_success():
    result = document_service.parse_document_file(_blank_pdf(), "scanned.pdf", "PDF")

    assert result.success is False
    assert result.book is None
    assert result.message is not None
    assert "no selectable text" in result.message


def test_scanned_pdf_never_yields_an_empty_successful_book():
    with pytest.raises(ValueError) as raised:
        DocumentService.parse_pdf(_blank_pdf(), "scanned.pdf")

    assert "no selectable text" in str(raised.value)
