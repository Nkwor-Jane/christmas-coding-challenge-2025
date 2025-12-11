from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.pdf_service import pdf_service
from app.models.schemas import PDFUploadResponse, TextExtractionResponse
from app.config import settings

router = APIRouter(prefix="/api/pdf", tags=["PDF"])

@router.post("/upload", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and process PDF file
    """
    # Validate file extension
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > settings.max_file_size:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Extract text from PDF
    result = await pdf_service.extract_text_from_pdf(content, file.filename)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to process PDF"))
    
    return PDFUploadResponse(
        success=True,
        message="PDF uploaded and processed successfully",
        pdf_id=result["pdf_id"],
        filename=result["filename"],
        size=len(content),
        pages=result["pages"],
        extracted_text_length=len(result["extracted_text"])
    )

@router.get("/text/{pdf_id}", response_model=TextExtractionResponse)
async def get_pdf_text(pdf_id: str):
    """
    Get extracted text from PDF
    """
    pdf_info = pdf_service.get_pdf_info(pdf_id)
    
    if not pdf_info:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return TextExtractionResponse(
        success=True,
        text=pdf_info["full_text"],
        pages=pdf_info["num_pages"],
        word_count=pdf_info["word_count"]
    )
@router.get("/cache/debug")
async def debug_cache():
    """
    Debug endpoint to see cached PDFs
    """
    return {
        "cached_pdf_ids": list(pdf_service.pdf_cache.keys()),
        "total_cached": len(pdf_service.pdf_cache)
    }