import json
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.tables import (
    AIConversation,
    AIMessage,
    Document,
    DocumentChunk,
    DocumentPage,
    ReadingProgress,
    ReadingSession,
)
from app.services.estimates import (
    learned_pages_per_minute,
    listening_percent,
    reading_percent,
    remaining_listening_minutes,
    remaining_reading_minutes,
)
from app.services.pdf_text import chunk_pages, document_stats, extract_pages
from app.services.storage import LocalStorage


def owned_document(db: Session, user_id: str, document_id: str) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.user_id != user_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def process_document(db: Session, document: Document, file_bytes: bytes, storage: LocalStorage) -> Document:
    path = storage.save_pdf(document.user_id, document.id, file_bytes)
    document.local_path = path
    document.file_size = len(file_bytes)
    try:
        pages = extract_pages(file_bytes)
    except Exception as exc:
        document.processing_status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc

    db.query(DocumentPage).filter(DocumentPage.document_id == document.id).delete()
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    for page in pages:
        db.add(DocumentPage(document_id=document.id, **page))
    for chunk in chunk_pages(pages):
        db.add(DocumentChunk(document_id=document.id, embedding=None, **chunk))
    document.total_pages = len(pages)
    document.processing_status = "ready"
    db.commit()
    db.refresh(document)
    return document


def delete_document(db: Session, document: Document, storage: LocalStorage) -> None:
    storage.delete_pdf(document.local_path)
    document_id = document.id
    conversation_ids = [
        row.id
        for row in db.query(AIConversation).filter(AIConversation.document_id == document_id).all()
    ]
    if conversation_ids:
        db.query(AIMessage).filter(AIMessage.conversation_id.in_(conversation_ids)).delete(
            synchronize_session=False
        )
    db.query(AIConversation).filter(AIConversation.document_id == document_id).delete()
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
    db.query(DocumentPage).filter(DocumentPage.document_id == document_id).delete()
    db.query(ReadingProgress).filter(ReadingProgress.document_id == document_id).delete()
    db.query(ReadingSession).filter(ReadingSession.document_id == document_id).delete()
    db.delete(document)
    db.commit()


def progress_map(db: Session, user_id: str, document_id: str) -> dict[str, ReadingProgress]:
    rows = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.user_id == user_id,
            ReadingProgress.document_id == document_id,
        )
        .all()
    )
    return {row.mode: row for row in rows}


def text_totals(db: Session, document_id: str) -> dict:
    pages = (
        db.query(DocumentPage)
        .filter(DocumentPage.document_id == document_id)
        .order_by(DocumentPage.page_number)
        .all()
    )
    payload = [
        {"page_number": page.page_number, "extracted_text": page.extracted_text}
        for page in pages
    ]
    stats = document_stats(payload)
    stats["pages"] = pages
    return stats


def document_detail(db: Session, user: object, document: Document) -> dict:
    stats = text_totals(db, document.id)
    modes = progress_map(db, user.id, document.id)
    reading = modes.get("reading")
    listening = modes.get("listening")
    sessions = (
        db.query(ReadingSession)
        .filter(ReadingSession.user_id == user.id, ReadingSession.document_id == document.id)
        .all()
    )
    reading_seconds = sum(item.duration_seconds for item in sessions if item.mode == "reading")
    listening_seconds = sum(item.duration_seconds for item in sessions if item.mode == "listening")
    pages_done = sum(item.pages_completed for item in sessions if item.mode == "reading")
    ppm = learned_pages_per_minute(pages_done, reading_seconds)
    current_page = reading.current_page if reading else 0
    heard = listening.position_offset if listening else 0
    full_text = stats["full_text"]
    remaining_text = full_text[heard:] if heard < len(full_text) else ""
    remaining_words = len(remaining_text.split()) if remaining_text else 0
    speed = 1.0
    return {
        "id": document.id,
        "title": document.title,
        "author": document.author,
        "file_name": document.file_name,
        "file_size": document.file_size,
        "total_pages": document.total_pages,
        "total_words": stats["total_words"],
        "total_chars": stats["total_chars"],
        "processing_status": document.processing_status,
        "created_at": document.created_at,
        "reading_progress": serialize_progress(reading),
        "listening_progress": serialize_progress(listening),
        "estimates": {
            "reading_percent": reading_percent(current_page, document.total_pages),
            "listening_percent": listening_percent(heard, stats["total_chars"]),
            "reading_minutes_left": remaining_reading_minutes(current_page, document.total_pages, ppm),
            "listening_minutes_left": remaining_listening_minutes(remaining_words, 150, speed),
            "pages_per_minute": round(ppm, 2),
        },
        "time_spent": {
            "reading_seconds": reading_seconds,
            "listening_seconds": listening_seconds,
        },
        "pages": [
            {
                "page_number": page.page_number,
                "extracted_text": page.extracted_text,
                "extraction_method": page.extraction_method,
            }
            for page in stats["pages"]
        ],
    }


def serialize_progress(row: ReadingProgress | None) -> dict | None:
    if row is None:
        return None
    return {
        "mode": row.mode,
        "current_page": row.current_page,
        "position_offset": row.position_offset,
        "progress_percentage": row.progress_percentage,
        "last_opened_at": row.last_opened_at,
        "completed_at": row.completed_at,
    }


def upsert_progress(
    db: Session,
    user_id: str,
    document: Document,
    mode: str,
    current_page: int,
    position_offset: int,
    updated_at: datetime | None = None,
) -> ReadingProgress:
    if mode not in {"reading", "listening"}:
        raise HTTPException(status_code=400, detail="mode must be reading or listening")
    stats = text_totals(db, document.id)
    if mode == "reading":
        percent = reading_percent(current_page, document.total_pages)
    else:
        percent = listening_percent(position_offset, stats["total_chars"])
    now = updated_at or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    row = (
        db.query(ReadingProgress)
        .filter(
            ReadingProgress.user_id == user_id,
            ReadingProgress.document_id == document.id,
            ReadingProgress.mode == mode,
        )
        .one_or_none()
    )
    stored_at = row.last_opened_at if row else None
    if stored_at is not None and stored_at.tzinfo is None:
        stored_at = stored_at.replace(tzinfo=timezone.utc)
    if stored_at is not None and stored_at > now:
        return row
    if row is None:
        row = ReadingProgress(user_id=user_id, document_id=document.id, mode=mode)
        db.add(row)
    row.current_page = max(1, current_page) if mode == "reading" else current_page
    row.position_offset = max(0, position_offset)
    row.progress_percentage = percent
    row.last_opened_at = now
    if percent >= 100 and row.completed_at is None:
        row.completed_at = now
    if percent < 100:
        row.completed_at = None
    db.commit()
    db.refresh(row)
    return row


def cited_pages_json(pages: list[int]) -> str:
    return json.dumps(pages)
