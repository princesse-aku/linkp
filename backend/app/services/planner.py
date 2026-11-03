from datetime import date, datetime, time, timedelta

MAX_POSTS_PER_RUN = 30


def plan_slots(start: date, end: date, per_week: int, at: time | None) -> list[datetime]:
    """Répartit les publications sur la période, selon la fréquence hebdomadaire."""
    days = (end - start).days + 1
    count = min(MAX_POSTS_PER_RUN, max(1, round(days / 7 * per_week)))
    step = days / count
    hour = at or time(9, 0)
    return [datetime.combine(start + timedelta(days=int(i * step)), hour) for i in range(count)]
