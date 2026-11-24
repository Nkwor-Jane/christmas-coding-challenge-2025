from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import AudioPreference, User

router = APIRouter(prefix="/audio", tags=["audio"])


class PreferenceIn(BaseModel):
    voice_id: str = "device-default"
    playback_speed: float = 1.0
    preferred_engine: str = "native"
    auto_play_next: bool = True


@router.get("/voices")
def voices():
    return {
        "engines": [
            {
                "id": "native",
                "label": "Device voice",
                "offline": True,
                "description": "Uses the voice installed on this phone. Works without a network connection.",
            },
            {
                "id": "cloud",
                "label": "Cloud voice",
                "offline": False,
                "description": "Higher consistency across devices. Generated audio can be cached for later.",
            },
        ]
    }


@router.get("/preferences")
def get_preferences(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(AudioPreference).filter(AudioPreference.user_id == user.id).one_or_none()
    if row is None:
        return {
            "voice_id": "device-default",
            "playback_speed": 1.0,
            "preferred_engine": "native",
            "auto_play_next": True,
        }
    return {
        "voice_id": row.voice_id,
        "playback_speed": row.playback_speed,
        "preferred_engine": row.preferred_engine,
        "auto_play_next": row.auto_play_next,
    }


@router.put("/preferences")
def put_preferences(
    body: PreferenceIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.preferred_engine not in {"native", "cloud"}:
        body.preferred_engine = "native"
    speed = min(2.0, max(0.5, body.playback_speed))
    row = db.query(AudioPreference).filter(AudioPreference.user_id == user.id).one_or_none()
    if row is None:
        row = AudioPreference(user_id=user.id)
        db.add(row)
    row.voice_id = body.voice_id
    row.playback_speed = speed
    row.preferred_engine = body.preferred_engine
    row.auto_play_next = body.auto_play_next
    db.commit()
    return get_preferences(user, db)
