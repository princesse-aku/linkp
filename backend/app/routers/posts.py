import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..auth import AuthUser, current_user
from ..schemas import (
    CalendarSyncResult,
    GenerateIn,
    GenerateOneIn,
    GenerateOut,
    MediaOut,
    PostImageIn,
    PostImageOut,
    PostOut,
    PostRegenerate,
    PostUpdate,
    ProfileOut,
)
from ..services import ai, images, keys
from ..services import calendar as gcal
from ..services import media as media_svc
from ..services.planner import plan_slots
from ..store import load_examples, load_profile, now, sub, with_id

log = logging.getLogger(__name__)
router = APIRouter(tags=["posts"])

PARALLEL_WRITERS = 4  # nombre de posts rédigés en même temps


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


def _new_post(theme: str, content: str, scheduled_for: str) -> dict:
    return {
        "theme": theme,
        "content": content,
        "scheduled_for": scheduled_for,
        "status": "draft",
        "media_urls": [],
        "calendar_event_id": None,
        "created_at": now(),
        "updated_at": now(),
    }


@dataclass
class Plan:
    """Ce qu'il faut rédiger : un thème et une date par post."""

    api_key: str
    profile: ProfileOut
    examples: list[str]
    themes: list[str]
    dates: list[str]


def _prepare(user: AuthUser) -> Plan:
    """Vérifie tout avant de lancer l'IA (clé, thèmes, période) et planifie les posts."""
    api_key = keys.require_key(user.uid)
    profile = load_profile(user.uid, user.email)
    if not profile.themes:
        raise HTTPException(400, "Ajoute au moins un thème.")
    if not (profile.start_date and profile.end_date):
        raise HTTPException(400, "Choisis une période de programmation.")
    if profile.end_date < profile.start_date:
        raise HTTPException(400, "La date de fin précède la date de début.")
    slots = plan_slots(profile.start_date, profile.end_date, profile.posts_per_week, profile.publish_time)
    return Plan(
        api_key=api_key,
        profile=profile,
        examples=load_examples(user.uid),
        themes=[profile.themes[i % len(profile.themes)] for i in range(len(slots))],
        dates=[s.isoformat() for s in slots],
    )


def _replace_old_drafts(uid: str) -> None:
    for old in sub(uid, "posts").stream():
        data = with_id(old)
        if data.get("status") != "published":
            _drop_event(uid, data)
            old.reference.delete()


@router.get("/posts", response_model=list[PostOut])
def list_posts(user: AuthUser = Depends(current_user)):
    docs = sub(user.uid, "posts").order_by("scheduled_for").stream()
    return [_out(with_id(d)) for d in docs]


@router.post("/posts/generate", response_model=GenerateOut)
def generate(body: GenerateIn | None = None, user: AuthUser = Depends(current_user)):
    """Génère tous les posts puis les renvoie d'un coup (voir aussi /posts/generate/stream)."""
    body = body or GenerateIn()
    plan = _prepare(user)

    def write(theme: str) -> str:
        return ai.generate_post(plan.profile, plan.examples, theme, api_key=plan.api_key, style=plan.profile.style_analysis)

    try:
        with ThreadPoolExecutor(max_workers=PARALLEL_WRITERS) as pool:
            texts = list(pool.map(write, plan.themes))
    except ai.AIKeyRejected:
        raise  # géré par le gestionnaire global (424)
    except ai.AIError as exc:
        raise HTTPException(502, str(exc))

    if body.replace_drafts:
        _replace_old_drafts(user.uid)

    col = sub(user.uid, "posts")
    created = []
    for date, theme, text in zip(plan.dates, plan.themes, texts):
        data = _new_post(theme, text, date)
        _, ref = col.add(data)
        data["id"] = ref.id
        created.append((ref, data))

    sync = CalendarSyncResult(connected=gcal.status(user.uid)["connected"])
    if sync.connected:
        for ref, data in created:
            err = _sync(user.uid, plan.profile.timezone, ref, data)
            if err:
                sync.error = err
            else:
                sync.synced += 1

    created.sort(key=lambda pair: pair[1]["scheduled_for"])
    return GenerateOut(posts=[_out(d) for _, d in created], calendar=sync)


def _line(event: dict) -> bytes:
    return (json.dumps(event, ensure_ascii=False) + "\n").encode()


@router.post("/posts/generate/stream")
def generate_stream(body: GenerateIn | None = None, user: AuthUser = Depends(current_user)):
    """Génère les posts et envoie chacun dès qu'il est prêt (une ligne JSON par événement).

    Événements :
      start       {total, slots: [{index, theme, scheduled_for}]}   (annonce avant toute rédaction)
      post        {index, post}                                      (un post terminé et enregistré)
      post_error  {index, message}                                   (un post a échoué, les autres continuent)
      fatal       {status, message}                                  (arrêt : clé refusée…)
      done        {created, failed, calendar}

    Les vérifications (clé, thèmes, période) ont lieu avant le flux : en cas de problème, c'est une
    erreur HTTP classique (400, 428…). Les anciens brouillons ne sont remplacés qu'au premier post réussi.
    """
    body = body or GenerateIn()
    plan = _prepare(user)
    uid = user.uid

    def stream():
        yield _line(
            {
                "type": "start",
                "total": len(plan.themes),
                "slots": [{"index": i, "theme": t, "scheduled_for": d} for i, (t, d) in enumerate(zip(plan.themes, plan.dates))],
            }
        )
        col = sub(uid, "posts")
        calendar = CalendarSyncResult(connected=gcal.status(uid)["connected"])
        replaced = not body.replace_drafts
        created = failed = 0

        def write(theme: str) -> str:
            return ai.generate_post(plan.profile, plan.examples, theme, api_key=plan.api_key, style=plan.profile.style_analysis)

        pool = ThreadPoolExecutor(max_workers=PARALLEL_WRITERS)
        try:
            futures = {pool.submit(write, theme): i for i, theme in enumerate(plan.themes)}
            for future in as_completed(futures):
                index = futures[future]
                try:
                    text = future.result()
                except ai.AIKeyRejected as exc:
                    yield _line({"type": "fatal", "status": 424, "message": str(exc)})
                    return
                except ai.AIError as exc:
                    failed += 1
                    yield _line({"type": "post_error", "index": index, "message": str(exc)})
                    continue
                except Exception:  # erreur inattendue sur un seul post : on ne casse pas les autres
                    log.exception("Rédaction du post %s impossible", index)
                    failed += 1
                    yield _line({"type": "post_error", "index": index, "message": "Erreur inattendue pendant la rédaction."})
                    continue

                if not replaced:  # le premier succès remplace les anciens brouillons
                    _replace_old_drafts(uid)
                    replaced = True
                data = _new_post(plan.themes[index], text, plan.dates[index])
                _, ref = col.add(data)
                data["id"] = ref.id
                if calendar.connected:
                    err = _sync(uid, plan.profile.timezone, ref, data)
                    if err:
                        calendar.error = err
                    else:
                        calendar.synced += 1
                created += 1
                yield _line({"type": "post", "index": index, "post": _out(data).model_dump()})
            yield _line({"type": "done", "created": created, "failed": failed, "calendar": calendar.model_dump()})
        finally:
            # Navigateur fermé ou arrêt anticipé : on n'attend pas les rédactions restantes.
            pool.shutdown(wait=False, cancel_futures=True)

    return StreamingResponse(
        stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.post("/posts/generate/one", response_model=PostOut, status_code=201)
def generate_one(body: GenerateOneIn, user: AuthUser = Depends(current_user)):
    """Rédige un seul post (réessai d'un post qui a échoué pendant la génération)."""
    api_key = keys.require_key(user.uid)
    profile = load_profile(user.uid, user.email)
    try:
        text = ai.generate_post(profile, load_examples(user.uid), body.theme, api_key=api_key, style=profile.style_analysis)
    except ai.AIKeyRejected:
        raise
    except ai.AIError as exc:
        raise HTTPException(502, str(exc))
    data = _new_post(body.theme, text, body.scheduled_for)
    _, ref = sub(user.uid, "posts").add(data)
    data["id"] = ref.id
    _sync(user.uid, profile.timezone, ref, data)
    return _out(data)


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


MAX_MEDIA_PER_POST = 10
_EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


@router.post("/posts/{post_id}/image", response_model=PostImageOut)
def generate_post_image(post_id: str, body: PostImageIn | None = None, user: AuthUser = Depends(current_user)):
    """Génère une image pour le post (RodiumAI), l'envoie sur Cloudinary et l'attache au post."""
    body = body or PostImageIn()
    api_key = keys.require_key(user.uid)
    ref, post = _get(user.uid, post_id)
    if len(post.get("media_urls") or []) >= MAX_MEDIA_PER_POST:
        raise HTTPException(409, f"Ce post a déjà {MAX_MEDIA_PER_POST} fichiers joints.")
    try:
        media_svc.ensure_configured()  # avant de générer : une image payante ne doit pas être perdue
    except media_svc.MediaError as exc:
        raise HTTPException(503, str(exc))

    prompt = images.build_prompt(post.get("theme", ""), post.get("content", ""), body.instruction)
    data, content_type = images.generate_image(prompt, api_key=api_key)  # AIKeyRejected -> 424, AIError -> 502

    filename = f"post-{post_id}.{_EXTENSIONS[content_type]}"
    try:
        uploaded = media_svc.upload(user.uid, data, filename, content_type)
    except media_svc.MediaError as exc:
        raise HTTPException(502, str(exc))
    doc = media_svc.register(user.uid, uploaded, filename)

    urls = [*(post.get("media_urls") or []), doc["url"]]
    ref.update({"media_urls": urls, "updated_at": now()})
    post["media_urls"] = urls
    return PostImageOut(post=_out(post), media=MediaOut.model_validate(doc))


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: str, user: AuthUser = Depends(current_user)):
    ref, post = _get(user.uid, post_id)
    _drop_event(user.uid, post)
    ref.delete()
