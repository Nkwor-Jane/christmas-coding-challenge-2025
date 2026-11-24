from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import Document, User
from app.services.library import delete_document, document_detail, owned_document, process_document
from app.services.pdf_text import narration_segments
from app.services.storage import LocalStorage

router = APIRouter(prefix="/documents", tags=["documents"])


def _summary(document: Document) -> dict:
    return {
        "id": document.id,
        "title": document.title,
        "author": document.author,
        "file_name": document.file_name,
        "file_size": document.file_size,
        "total_pages": document.total_pages,
        "processing_status": document.processing_status,
        "created_at": document.created_at,
    }


@router.get("")
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [_summary(row) for row in rows]


@router.post("")
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    author: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty")
    if len(data) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=400, detail="File is larger than 15MB")
    document = Document(
        user_id=user.id,
        title=(title or file.filename.rsplit(".", 1)[0]).strip() or file.filename,
        author=(author or "").strip() or None,
        file_name=file.filename,
        processing_status="processing",
        file_size=len(data),
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    process_document(db, document, data, LocalStorage())
    return document_detail(db, user, document)


@router.get("/{document_id}")
def get_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = owned_document(db, user.id, document_id)
    return document_detail(db, user, document)


@router.get("/{document_id}/file")
def download_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = owned_document(db, user.id, document_id)
    if not document.local_path:
        raise HTTPException(status_code=404, detail="File is not stored")
    data = LocalStorage().read_pdf(document.local_path)
    return Response(content=data, media_type="application/pdf")


@router.get("/{document_id}/narration")
def narration(
    document_id: str,
    start_page: int = 1,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = owned_document(db, user.id, document_id)
    detail = document_detail(db, user, document)
    segments = narration_segments(detail["pages"], start_page=max(1, start_page))
    return {"document_id": document.id, "start_page": start_page, "segments": segments}


@router.post("/{document_id}/process")
def reprocess(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = owned_document(db, user.id, document_id)
    if not document.local_path:
        raise HTTPException(status_code=400, detail="Nothing to process")
    data = LocalStorage().read_pdf(document.local_path)
    process_document(db, document, data, LocalStorage())
    return document_detail(db, user, document)


@router.delete("/{document_id}")
def remove_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = owned_document(db, user.id, document_id)
    delete_document(db, document, LocalStorage())
    return {"deleted": True}
