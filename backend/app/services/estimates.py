import math
from datetime import date, datetime, timedelta, timezone


DEFAULT_PAGES_PER_MINUTE = 2.0
DEFAULT_WORDS_PER_MINUTE = 150.0
IDLE_GRACE_SECONDS = 180


def reading_percent(current_page: int, total_pages: int) -> float:
    if total_pages <= 0:
        return 0.0
    return round(min(100.0, max(0, current_page) / total_pages * 100), 1)


def listening_percent(position_offset: int, total_chars: int) -> float:
    if total_chars <= 0:
        return 0.0
    return round(min(100.0, max(0, position_offset) / total_chars * 100), 1)


def learned_pages_per_minute(pages_completed: int, duration_seconds: int) -> float:
    if duration_seconds < 60 or pages_completed <= 0:
        return DEFAULT_PAGES_PER_MINUTE
    return pages_completed / (duration_seconds / 60)


def remaining_reading_minutes(current_page: int, total_pages: int, pages_per_minute: float) -> float:
    remaining = max(0, total_pages - max(0, current_page))
    if pages_per_minute <= 0:
        return 0.0
    return round(remaining / pages_per_minute, 1)


def remaining_listening_minutes(remaining_words: int, words_per_minute: float, playback_speed: float) -> float:
    rate = words_per_minute * playback_speed
    if rate <= 0:
        return 0.0
    return round(max(0, remaining_words) / rate, 1)


def daily_page_target(remaining_pages: int, remaining_days: int) -> int:
    days = remaining_days if remaining_days >= 1 else 1
    if remaining_pages <= 0:
        return 0
    return math.ceil(remaining_pages / days)


def days_until(target: date, today: date) -> int:
    return (target - today).days


def bounded_duration(
    started_at: datetime,
    ended_at: datetime,
    last_heartbeat_at: datetime,
    reported_seconds: int,
    idle_grace: int = IDLE_GRACE_SECONDS,
) -> int:
    """Count only time the session was still active, plus a short grace after the last heartbeat."""
    cap = last_heartbeat_at + timedelta(seconds=idle_grace)
    effective_end = ended_at if ended_at < cap else cap
    if effective_end < started_at:
        effective_end = started_at
    ceiling = int((effective_end - started_at).total_seconds())
    return max(0, min(int(reported_seconds), ceiling))


def ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value
