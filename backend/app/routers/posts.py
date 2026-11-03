import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from ..auth import AuthUser, current_user
from ..schemas import CalendarSyncResult, GenerateIn, GenerateOut, PostOut, PostRegenerate, PostUpdate
from ..services import ai, keys
from ..services import calendar as gcal
from ..services.planner import plan_slots
from ..store import load_examples, load_profile, now, sub, with_id

log = logging.getLogger(__name__)
router = APIRouter(tags=["posts"])


def _out(data: dict) -> PostOut:
    return PostOut.model_validate(data)


def _get(uid: str, post_id: str) -> tuple:
    ref = sub(uid, "posts").document(post_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(404, "Post introuvable.")
    return ref, with_id(snap)


def _sync(uid: str, tz: str, ref, post: dict) -> str | None:
    """Met à jour l'événement Google Agenda d'un post. Renvoie un message d'erreur éventuel."""
    try:
        event_id = gcal.upsert_event(uid, post, tz)
    except gcal.NotConnected:
        return None
    except gcal.CalendarError as exc:
        return str(exc)
    if event_id != post.get("calendar_event_id"):
        ref.update({"calendar_event_id": event_id})
        post["calendar_event_id"] = event_id
    return None


def _drop_event(uid: str, post: dict) -> None:
    if not post.get("calendar_event_id"):
        return
    try:
        gcal.delete_event(uid, post["calendar_event_id"])
    except gcal.CalendarError as exc:
        log.info("Événement non supprimé : %s", exc)


@router.get("/posts", response_model=list[PostOut])
def list_posts(user: AuthUser = Depends(current_user)):
    docs = sub(user.uid, "posts").order_by("scheduled_for").stream()
    return [_out(with_id(d)) for d in docs]


@router.post("/posts/generate", response_model=GenerateOut)
def generate(body: GenerateIn | None = None, user: AuthUser = Depends(current_user)):
    body = body or GenerateIn()
    api_key = keys.require_key(user.uid)
    profile = load_profile(user.uid, user.email)
    if not profile.themes:
        raise HTTPException(400, "Ajoute au moins un thème.")
    if not (profile.start_date and profile.end_date):
        raise HTTPException(400, "Choisis une période de programmation.")
    if profile.end_date < profile.start_date:
        raise HTTPException(400, "La date de fin précède la date de début.")

    examples = load_examples(user.uid)
    slots = plan_slots(profile.start_date, profile.end_date, profile.posts_per_week, profile.publish_time)
    themes = [profile.themes[i % len(profile.themes)] for i in range(len(slots))]

    def write(theme: str) -> str:
        return ai.generate_post(profile, examples, theme, api_key=api_key, style=profile.style_analysis)

    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            texts = list(pool.map(write, themes))
    except ai.AIKeyRejected:
        raise  # géré par le gestionnaire global (424)
    except ai.AIError as exc:
        raise HTTPException(502, str(exc))

    col = sub(user.uid, "posts")
    if body.replace_drafts:
        for old in col.stream():
            data = with_id(old)
            if data.get("status") != "published":
                _drop_event(user.uid, data)
                old.reference.delete()

    created = []
    for slot, theme, text in zip(slots, themes, texts):
        data = {
            "theme": theme,
            "content": text,
            "scheduled_for": slot.isoformat(),
            "status": "draft",
            "media_urls": [],
            "calendar_event_id": None,
            "created_at": now(),
            "updated_at": now(),
        }
        _, ref = col.add(data)
        data["id"] = ref.id
        created.append((ref, data))

    sync = CalendarSyncResult(connected=gcal.status(user.uid)["connected"])
    if sync.connected:
        for ref, data in created:
            err = _sync(user.uid, profile.timezone, ref, data)
            if err:
                sync.error = err
            else:
                sync.synced += 1

    created.sort(key=lambda pair: pair[1]["scheduled_for"])
    return GenerateOut(posts=[_out(d) for _, d in created], calendar=sync)


@router.patch("/posts/{post_id}", response_model=PostOut)
def update_post(post_id: str, body: PostUpdate, user: AuthUser = Depends(current_user)):
    ref, post = _get(user.uid, post_id)
    changes = body.model_dump(exclude_unset=True)
    if "scheduled_for" in changes and changes["scheduled_for"]:
        try:
            datetime.fromisoformat(changes["scheduled_for"])
        except ValueError:
            raise HTTPException(422, "Date de publication invalide.")
    if changes:
        changes["updated_at"] = now()
        ref.update(changes)
        post.update(changes)
        profile = load_profile(user.uid)
        if post.get("status") == "published":
            _drop_event(user.uid, post)
            ref.update({"calendar_event_id": None})
            post["calendar_event_id"] = None
        elif post.get("calendar_event_id") and post.get("scheduled_for"):
            _sync(user.uid, profile.timezone, ref, post)
    return _out(post)


@router.post("/posts/{post_id}/regenerate", response_model=PostOut)
def regenerate(post_id: str, body: PostRegenerate, user: AuthUser = Depends(current_user)):
    api_key = keys.require_key(user.uid)
    ref, post = _get(user.uid, post_id)
    profile = load_profile(user.uid, user.email)
    try:
        text = ai.generate_post(
            profile,
            load_examples(user.uid),
            post.get("theme", ""),
            api_key=api_key,
            style=profile.style_analysis,
            instruction=body.instruction,
            previous=post.get("content") if body.instruction else None,
        )
    except ai.AIKeyRejected:
        raise  # géré par le gestionnaire global (424)
    except ai.AIError as exc:
        raise HTTPException(502, str(exc))
    ref.update({"content": text, "updated_at": now()})
    post["content"] = text
    if post.get("calendar_event_id") and post.get("scheduled_for"):
        _sync(user.uid, profile.timezone, ref, post)
    return _out(post)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: str, user: AuthUser = Depends(current_user)):
    ref, post = _get(user.uid, post_id)
    _drop_event(user.uid, post)
    ref.delete()
