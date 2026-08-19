"""Tests for reader utilities endpoints."""

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
        "bookmarks": ["paragraph-0-0"],
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
