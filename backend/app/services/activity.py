from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.tables import Document, ReadingDailyStat, ReadingProgress, ReadingSession, SyncEvent
from app.services.estimates import bounded_duration, ensure_aware
from app.services.library import owned_document, upsert_progress


def start_session(db: Session, user_id: str, document_id: str, mode: str, device_id: str) -> ReadingSession:
    owned_document(db, user_id, document_id)
    if mode not in {"reading", "listening"}:
        raise HTTPException(status_code=400, detail="mode must be reading or listening")
    now = datetime.now(timezone.utc)
    session = ReadingSession(
        user_id=user_id,
        document_id=document_id,
        mode=mode,
        started_at=now,
        last_heartbeat_at=now,
        device_id=device_id or "",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def touch_session(db: Session, user_id: str, session_id: str) -> ReadingSession:
    session = db.get(ReadingSession, session_id)
    if session is None or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.ended_at is None:
        session.last_heartbeat_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)
    return session


def end_session(
    db: Session,
    user_id: str,
    session_id: str,
    reported_seconds: int,
    pages_completed: int,
    client_event_id: str | None = None,
) -> ReadingSession:
    if client_event_id:
        existing = (
            db.query(ReadingSession)
            .filter(ReadingSession.client_event_id == client_event_id)
            .one_or_none()
        )
        if existing:
            return existing
    session = db.get(ReadingSession, session_id)
    if session is None or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.ended_at is not None:
        return session
    ended = datetime.now(timezone.utc)
    session.ended_at = ended
    session.duration_seconds = bounded_duration(
        ensure_aware(session.started_at),
        ended,
        ensure_aware(session.last_heartbeat_at),
        reported_seconds,
    )
    session.pages_completed = max(0, pages_completed)
    session.client_event_id = client_event_id
    _add_daily(db, session)
    db.commit()
    db.refresh(session)
    return session


def _add_daily(db: Session, session: ReadingSession) -> None:
    stat_date = ensure_aware(session.ended_at).date()
    row = (
        db.query(ReadingDailyStat)
        .filter(
            ReadingDailyStat.user_id == session.user_id,
            ReadingDailyStat.stat_date == stat_date,
            ReadingDailyStat.mode == session.mode,
        )
        .one_or_none()
    )
    if row is None:
        row = ReadingDailyStat(
            user_id=session.user_id,
            stat_date=stat_date,
            mode=session.mode,
            duration_seconds=0,
            pages_completed=0,
        )
        db.add(row)
    row.duration_seconds += session.duration_seconds
    row.pages_completed += session.pages_completed


def apply_sync_event(db: Session, user_id: str, event_id: str, event_type: str, payload: dict) -> str:
    existing = (
        db.query(SyncEvent)
        .filter(SyncEvent.user_id == user_id, SyncEvent.event_id == event_id)
        .one_or_none()
    )
    if existing:
        return "duplicate"
    if event_type == "progress":
        document = owned_document(db, user_id, payload["document_id"])
        updated = payload.get("updated_at")
        updated_at = datetime.fromisoformat(updated) if updated else None
        upsert_progress(
            db,
            user_id,
            document,
            payload["mode"],
            int(payload.get("current_page") or 1),
            int(payload.get("position_offset") or 0),
            updated_at,
        )
    elif event_type == "session":
        already = (
            db.query(ReadingSession)
            .filter(ReadingSession.client_event_id == event_id)
            .one_or_none()
        )
        if already is not None:
            db.add(SyncEvent(user_id=user_id, event_id=event_id, event_type=event_type))
            db.commit()
            return "duplicate"
        end_session(
            db,
            user_id,
            payload["session_id"],
            int(payload.get("duration_seconds") or 0),
            int(payload.get("pages_completed") or 0),
            client_event_id=event_id,
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported sync event")
    db.add(SyncEvent(user_id=user_id, event_id=event_id, event_type=event_type))
    db.commit()
    return "applied"


def pull_changes(db: Session, user_id: str, since: datetime | None) -> dict:
    progress_query = db.query(ReadingProgress).filter(ReadingProgress.user_id == user_id)
    session_query = db.query(ReadingSession).filter(ReadingSession.user_id == user_id)
    if since is not None:
        progress_query = progress_query.filter(ReadingProgress.last_opened_at >= since)
        session_query = session_query.filter(ReadingSession.started_at >= since)
    documents = db.query(Document).filter(Document.user_id == user_id).all()
    return {
        "documents": [
            {
                "id": item.id,
                "title": item.title,
                "author": item.author,
                "file_name": item.file_name,
                "total_pages": item.total_pages,
                "processing_status": item.processing_status,
                "file_size": item.file_size,
                "created_at": item.created_at,
            }
            for item in documents
        ],
        "progress": progress_query.all(),
        "sessions": session_query.all(),
    }
