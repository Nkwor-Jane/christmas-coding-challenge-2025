from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import User
from app.services.library import owned_document, progress_map, serialize_progress, upsert_progress

router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressUpdate(BaseModel):
    mode: str
    current_page: int = Field(default=1, ge=1)
    position_offset: int = Field(default=0, ge=0)
    updated_at: datetime | None = None


@router.get("/{document_id}")
def get_progress(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_document(db, user.id, document_id)
    modes = progress_map(db, user.id, document_id)
    return {
        "reading": serialize_progress(modes.get("reading")),
        "listening": serialize_progress(modes.get("listening")),
    }


@router.put("/{document_id}")
def put_progress(
    document_id: str,
    body: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = owned_document(db, user.id, document_id)
    row = upsert_progress(
        db,
        user.id,
        document,
        body.mode,
        body.current_page,
        body.position_offset,
        body.updated_at,
    )
    return serialize_progress(row)
