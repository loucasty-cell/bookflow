"""Tests for reader utilities endpoints."""

from app.main import app


def test_segment_endpoint(client):
    payload = {
        "text": "First sentence. Second sentence with detail.\n\nNew paragraph begins here."
    }
    response = client.post("/api/reader/segment", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["paragraphs"]) == 2
    assert len(data["sentences"]) >= 2
    assert data["wordCount"] > 0


def test_reading_time_endpoint(client):
    payload = {
        "wordCount": 440,
        "wordsPerMinute": 220
    }
    response = client.post("/api/reader/reading-time", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["minutes"] == 2
    assert data["formattedLabel"] == "2 min read"


def test_notes_export_import(client):
    export_data = {
        "version": "1.0",
        "exportedAt": "2026-08-20T00:00:00Z",
        "documentId": "book-1",
        "documentTitle": "Sample Book",
        "notes": [
            {
                "id": "note-1",
                "paragraphId": "paragraph-0-0",
                "quote": "Quote text",
                "text": "My note"
            }
        ],
        "bookmarks": [{"paragraphId": "paragraph-0-0", "title": "Start"}],
        "progressPercent": 50
    }

    # Test export endpoint
    res_export = client.post("/api/reader/notes/export", json=export_data)
    assert res_export.status_code == 200
    assert len(res_export.json()["notes"]) == 1

    # Test import validation endpoint
    res_import = client.post("/api/reader/notes/import", json=export_data)
    assert res_import.status_code == 200
    assert res_import.json()["valid"] is True
    assert res_import.json()["notes_count"] == 1


def test_reader_routes_are_registered_under_api_reader():
    paths = {path for path in app.openapi()["paths"] if path.startswith("/api/reader")}

    assert paths == {
        "/api/reader/segment",
        "/api/reader/reading-time",
        "/api/reader/notes/export",
        "/api/reader/notes/import",
    }


def test_unprefixed_reader_routes_are_not_exposed(client):
    assert client.post("/reading-time", json={"wordCount": 220}).status_code == 404
    assert client.post("/notes/export", json={}).status_code == 404
    assert client.post("/notes/import", json={}).status_code == 404
    assert client.post("/segment", json={"text": "One. Two."}).status_code == 404


def test_reading_lens_stays_on_its_own_path():
    paths = {path for path in app.openapi()["paths"] if "reading-lens" in path}

    assert paths == {"/api/reading-lens"}


def test_all_reader_routes_still_answer_over_http(client):
    segment = client.post("/api/reader/segment", json={"text": "One. Two."})
    reading_time = client.post("/api/reader/reading-time", json={"wordCount": 220})
    notes_export = client.post(
        "/api/reader/notes/export",
        json={"exportedAt": "2026-08-20T00:00:00Z", "documentId": "book-1"},
    )
    notes_import = client.post(
        "/api/reader/notes/import",
        json={"exportedAt": "2026-08-20T00:00:00Z", "documentId": "book-1"},
    )

    assert segment.status_code == 200
    assert reading_time.status_code == 200
    assert notes_export.status_code == 200
    assert notes_import.status_code == 200
