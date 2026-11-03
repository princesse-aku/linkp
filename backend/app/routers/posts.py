from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai import rodium
from ..auth import current_user_id
from ..db import get_db
from ..models import ExamplePost, GeneratedPost, Profile
from ..schemas import PostOut

router = APIRouter()


@router.get("/posts", response_model=list[PostOut])
def list_posts(uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    return db.scalars(
        select(GeneratedPost).where(GeneratedPost.user_id == uid).order_by(GeneratedPost.scheduled_for)
    ).all()


@router.post("/posts/generate", response_model=list[PostOut])
def generate(uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    p = db.get(Profile, uid)
    if not p or not p.themes or not p.start_date or not p.end_date:
        raise HTTPException(400, "Renseigne au moins des thèmes et une période.")
    if p.end_date < p.start_date:
        raise HTTPException(400, "La date de fin précède la date de début.")
    examples = [e.content for e in db.scalars(select(ExamplePost).where(ExamplePost.user_id == uid))]

    # Répartit les publications sur la période selon la fréquence choisie.
    days = (p.end_date - p.start_date).days + 1
    count = max(1, round(days / 7 * p.posts_per_week))
    step = days / count
    hour = p.publish_time or time(9, 0)

    created = []
    for i in range(count):
        theme = p.themes[i % len(p.themes)]
        try:
            text = rodium.generate_post(rodium.build_prompt(p, examples, theme))
        except RuntimeError as e:
            raise HTTPException(503, str(e))
        day = p.start_date + timedelta(days=int(i * step))
        post = GeneratedPost(user_id=uid, theme=theme, content=text, scheduled_for=datetime.combine(day, hour))
        db.add(post)
        created.append(post)
    db.commit()
    for c in created:
        db.refresh(c)
    return created
