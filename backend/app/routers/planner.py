from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import ReadingGoal, ReadingProgress, User
from app.services.estimates import daily_page_target, days_until
from app.services.library import owned_document

router = APIRouter(tags=["planner"])


class GoalIn(BaseModel):
    document_id: str | None = None
    goal_type: str
    target_value: int | None = None
    target_date: date | None = None


def _goal_payload(goal: ReadingGoal, pages_per_day: int | None = None) -> dict:
    return {
        "id": goal.id,
        "document_id": goal.document_id,
        "goal_type": goal.goal_type,
        "target_value": goal.target_value,
        "target_date": goal.target_date,
        "start_date": goal.start_date,
        "status": goal.status,
        "pages_per_day": pages_per_day if pages_per_day is not None else goal.target_value,
    }


@router.post("/goals")
def create_goal(body: GoalIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.goal_type not in {"pages_per_day", "minutes_per_day", "completion_date"}:
        raise HTTPException(status_code=400, detail="Unsupported goal type")
    total_pages = 0
    current_page = 0
    if body.document_id:
        document = owned_document(db, user.id, body.document_id)
        total_pages = document.total_pages
        progress = (
            db.query(ReadingProgress)
            .filter(
                ReadingProgress.user_id == user.id,
                ReadingProgress.document_id == document.id,
                ReadingProgress.mode == "reading",
            )
            .one_or_none()
        )
        current_page = progress.current_page if progress else 0
    remaining = max(0, total_pages - current_page)
    if body.goal_type == "completion_date":
        if body.target_date is None:
            raise HTTPException(status_code=400, detail="A completion goal needs a target date")
        target_value = daily_page_target(remaining, days_until(body.target_date, date.today()))
    else:
        if not body.target_value or body.target_value < 1:
            raise HTTPException(status_code=400, detail="target_value must be at least 1")
        target_value = body.target_value
    goal = ReadingGoal(
        user_id=user.id,
        document_id=body.document_id,
        goal_type=body.goal_type,
        target_value=target_value,
        target_date=body.target_date,
        start_date=datetime.now(timezone.utc).date(),
        status="active",
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _goal_payload(goal, target_value)


@router.get("/goals")
def list_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = db.query(ReadingGoal).filter(ReadingGoal.user_id == user.id).all()
    payload = []
    for goal in goals:
        pages_per_day = goal.target_value
        if goal.goal_type == "completion_date" and goal.document_id and goal.target_date:
            document = owned_document(db, user.id, goal.document_id)
            progress = (
                db.query(ReadingProgress)
                .filter(
                    ReadingProgress.user_id == user.id,
                    ReadingProgress.document_id == document.id,
                    ReadingProgress.mode == "reading",
                )
                .one_or_none()
            )
            current = progress.current_page if progress else 0
            pages_per_day = daily_page_target(
                max(0, document.total_pages - current),
                days_until(goal.target_date, date.today()),
            )
        payload.append(_goal_payload(goal, pages_per_day))
    return payload
