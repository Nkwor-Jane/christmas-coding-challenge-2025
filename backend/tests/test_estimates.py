from datetime import datetime, timedelta, timezone

from app.services.estimates import (
    bounded_duration,
    daily_page_target,
    listening_percent,
    reading_percent,
    remaining_listening_minutes,
    remaining_reading_minutes,
)
from app.services.pdf_text import narration_segments


def test_reading_and_listening_progress_are_independent_measures():
    assert reading_percent(50, 300) == 16.7
    assert listening_percent(500, 1000) == 50.0
    assert reading_percent(0, 0) == 0.0


def test_time_estimates():
    assert remaining_reading_minutes(0, 300, 2) == 150.0
    assert remaining_listening_minutes(12000, 150, 1.5) == 53.3


def test_missed_days_raise_the_daily_target():
    assert daily_page_target(300, 10) == 30
    assert daily_page_target(50, 0) == 50
    assert daily_page_target(0, 4) == 0


def test_idle_gap_does_not_count_as_reading_time():
    started = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    heartbeat = started + timedelta(seconds=10)
    ended = started + timedelta(hours=2)
    assert bounded_duration(started, ended, heartbeat, 7200) == 190


def test_narration_queue_keeps_page_order_and_word_boundaries():
    first = " ".join(f"word{i}" for i in range(30))
    pages = [
        {"page_number": 1, "extracted_text": first},
        {"page_number": 2, "extracted_text": "second page"},
    ]
    segments = narration_segments(pages, start_page=1, max_chars=80)
    assert segments[0]["page_number"] == 1
    assert segments[-1] == {"page_number": 2, "text": "second page", "char_start": 0}
    assert all(not item["text"].endswith(" ") for item in segments)
    rebuilt = " ".join(item["text"] for item in segments if item["page_number"] == 1)
    assert rebuilt == first
