from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

# India Standard Time
IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    """Return current time in IST as an aware datetime."""
    return datetime.now(IST)


def ensure_aware_in_ist(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Ensure the provided datetime is timezone-aware in IST.
    - If dt is None -> returns None
    - If dt is naive -> treat it as IST-local and set tzinfo accordingly
    - If dt is aware -> convert to IST
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)
