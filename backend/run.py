"""Startup entrypoint script for Bookflow FastAPI Backend (Desktop + Mobile LAN ready)."""

import os
import socket
import uvicorn
from app.core.config import settings


def get_local_ip() -> str:
    """Retrieve local network IP for mobile device connections on same Wi-Fi."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def main() -> None:
    local_ip = get_local_ip()
    port = settings.port
    print("\n========================================================")
    print("  Bookflow Accelerated OCR Backend (Desktop + Mobile)   ")
    print("========================================================")
    print(f"  Desktop Local URL : http://localhost:{port}")
    print(f"  Desktop Docs URL  : http://localhost:{port}/docs")
    print(f"  Mobile / LAN URL  : http://{local_ip}:{port}")
    print(f"  Mobile Docs URL   : http://{local_ip}:{port}/docs")
    print("========================================================\n")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.environment == "development",
        log_level="info",
    )


if __name__ == "__main__":
    main()
