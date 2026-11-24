from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import ReadingSession, User
from app.services.activity import end_session, start_session, touch_session

router = APIRouter(prefix="/sessions", tags=["sessions"])


class StartSession(BaseModel):
    document_id: str
    mode: str
    device_id: str = ""


class EndSession(BaseModel):
    duration_seconds: int = Field(ge=0)
    pages_completed: int = Field(default=0, ge=0)
    client_event_id: str | None = None


def _session_payload(session: ReadingSession) -> dict:
    return {
        "id": session.id,
        "document_id": session.document_id,
        "mode": session.mode,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "duration_seconds": session.duration_seconds,
        "pages_completed": session.pages_completed,
        "device_id": session.device_id,
    }


@router.post("/start")
def start(body: StartSession, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = start_session(db, user.id, body.document_id, body.mode, body.device_id)
    return _session_payload(session)


@router.post("/{session_id}/heartbeat")
def heartbeat(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = touch_session(db, user.id, session_id)
    return _session_payload(session)


@router.post("/{session_id}/end")
def finish(
    session_id: str,
    body: EndSession,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = end_session(
        db,
        user.id,
        session_id,
        body.duration_seconds,
        body.pages_completed,
        body.client_event_id,
    )
    return _session_payload(session)


@router.get("")
def list_sessions(
    document_id: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ReadingSession).filter(ReadingSession.user_id == user.id)
    if document_id:
        query = query.filter(ReadingSession.document_id == document_id)
    return [_session_payload(row) for row in query.order_by(ReadingSession.started_at.desc()).all()]
