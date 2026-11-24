from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import ReadingProgress, ReadingSession, User

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _dates_with_activity(sessions: list[ReadingSession]) -> set[date]:
    found = set()
    for session in sessions:
        if session.duration_seconds <= 0 or session.ended_at is None:
            continue
        stamp = session.ended_at
        found.add(stamp.date() if hasattr(stamp, "date") else stamp)
    return found


def _streak(days: set[date], today: date) -> int:
    cursor = today if today in days else today - timedelta(days=1)
    if cursor not in days:
        return 0
    count = 0
    while cursor in days:
        count += 1
        cursor -= timedelta(days=1)
    return count


@router.get("/overview")
def overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(ReadingSession).filter(ReadingSession.user_id == user.id).all()
    progress = db.query(ReadingProgress).filter(ReadingProgress.user_id == user.id).all()

    def pack(mode: str) -> dict:
        rows = [item for item in sessions if item.mode == mode]
        completed = {
            item.document_id
            for item in progress
            if item.mode == mode and item.completed_at is not None
        }
        return {
            "total_seconds": sum(item.duration_seconds for item in rows),
            "total_pages": sum(item.pages_completed for item in rows),
            "sessions": len(rows),
            "books_completed": len(completed),
        }

    return {
        "reading": pack("reading"),
        "listening": pack("listening"),
        "streak_days": _streak(_dates_with_activity(sessions), date.today()),
    }
