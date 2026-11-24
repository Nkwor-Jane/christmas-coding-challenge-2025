from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import DeviceInstallation, User
from app.services.activity import apply_sync_event, pull_changes
from app.services.library import serialize_progress

router = APIRouter(prefix="/sync", tags=["sync"])


class SyncEventIn(BaseModel):
    event_id: str = Field(min_length=1, max_length=64)
    type: str
    payload: dict


class SyncPush(BaseModel):
    events: list[SyncEventIn]


class SyncPull(BaseModel):
    since: datetime | None = None


class DeviceIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=100)
    platform: str = "unknown"


def _session_payload(session) -> dict:
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


@router.post("/push")
def push(body: SyncPush, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = []
    for event in body.events:
        status = apply_sync_event(db, user.id, event.event_id, event.type, event.payload)
        results.append({"event_id": event.event_id, "status": status})
    return {"results": results}


@router.post("/pull")
def pull(body: SyncPull, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = pull_changes(db, user.id, body.since)
    return {
        "documents": data["documents"],
        "progress": [serialize_progress(row) | {"document_id": row.document_id} for row in data["progress"]],
        "sessions": [_session_payload(row) for row in data["sessions"]],
    }


@router.post("/devices")
def register_device(body: DeviceIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(DeviceInstallation)
        .filter(DeviceInstallation.user_id == user.id, DeviceInstallation.device_id == body.device_id)
        .one_or_none()
    )
    if row is None:
        row = DeviceInstallation(user_id=user.id, device_id=body.device_id, platform=body.platform)
        db.add(row)
        db.commit()
    return {"device_id": row.device_id, "platform": row.platform}
