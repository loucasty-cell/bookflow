"""Document parsing and validation endpoints."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ..services.document_service import document_service
from ..models.document import ParseResponse, DocumentValidationResponse
from ..core.config import settings

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/validate", response_model=DocumentValidationResponse)
async def validate_document(
    file_name: str = Form(..., description="Name of the file"),
    file_size_bytes: int = Form(..., description="Size of file in bytes"),
):
    """Validate document format and file size against application constraints."""
    return document_service.validate_file(file_name=file_name, file_size_bytes=file_size_bytes)


@router.post("/parse", response_model=ParseResponse)
async def parse_document(
    file: UploadFile = File(..., description="Document file (PDF, EPUB, TXT, MD)"),
):
    """
    Parse a document into the normalized Bookflow Book JSON structure
    suitable for direct consumption by the frontend Reader.
    """
    file_name = file.filename or "untitled"
    contents = await file.read()
    file_size = len(contents)

    # Validate
    validation = document_service.validate_file(file_name, file_size)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=validation.error,
        )

    # Parse
    response = document_service.parse_document_file(
        file_bytes=contents,
        file_name=file_name,
        file_kind=validation.kind,
    )

    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=response.message or "Failed to parse document",
        )

    return response
