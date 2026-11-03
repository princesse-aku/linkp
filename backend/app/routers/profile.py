from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user_id
from ..db import get_db
from ..models import ExamplePost, Profile
from ..schemas import ExampleIn, ExampleOut, ProfileIn, ProfileOut

router = APIRouter()


def _get_or_create(db: Session, uid: str) -> Profile:
    p = db.get(Profile, uid)
    if not p:
        p = Profile(user_id=uid, tones=[], themes=[])
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


@router.get("/profile", response_model=ProfileOut)
def get_profile(uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    return _get_or_create(db, uid)


@router.put("/profile", response_model=ProfileOut)
def save_profile(data: ProfileIn, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    p = _get_or_create(db, uid)
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.get("/examples", response_model=list[ExampleOut])
def list_examples(uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    return db.scalars(select(ExamplePost).where(ExamplePost.user_id == uid).order_by(ExamplePost.id.desc())).all()


@router.post("/examples", response_model=ExampleOut, status_code=201)
def add_example(data: ExampleIn, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    _get_or_create(db, uid)
    ex = ExamplePost(user_id=uid, content=data.content)
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@router.delete("/examples/{example_id}", status_code=204)
def delete_example(example_id: int, uid: str = Depends(current_user_id), db: Session = Depends(get_db)):
    ex = db.get(ExamplePost, example_id)
    if ex and ex.user_id == uid:
        db.delete(ex)
        db.commit()
