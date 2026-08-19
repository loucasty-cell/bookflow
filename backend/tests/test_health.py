"""Health and system info endpoint tests."""

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data


def test_info_endpoint(client):
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert "supported_formats" in data
    assert ".pdf" in data["supported_formats"]
    assert "hf_ocr" in data
