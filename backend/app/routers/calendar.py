import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from ..auth import AuthUser, current_user
from ..config import settings
from ..schemas import CalendarStatus, CalendarSyncResult
from ..services import calendar as gcal
from ..store import load_profile, sub, with_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["agenda"])


def _back(result: str, detail: str | None = None) -> RedirectResponse:
    params = {"calendar": result}
    if detail:
        params["detail"] = detail
    return RedirectResponse(f"{settings.frontend_origin.rstrip('/')}/dashboard/agenda?{urlencode(params)}")


@router.get("/status", response_model=CalendarStatus)
def calendar_status(user: AuthUser = Depends(current_user)):
    return gcal.status(user.uid)


@router.get("/connect")
def connect(user: AuthUser = Depends(current_user)):
    """Renvoie l'URL de consentement Google (le navigateur y redirige l'utilisateur)."""
    try:
        return {"url": gcal.auth_url(user.uid)}
    except gcal.CalendarError as exc:
        raise HTTPException(503, str(exc))


@router.get("/callback", include_in_schema=False)
def callback(code: str | None = None, state: str | None = None, error: str | None = None):
    """Retour de Google : échange le code puis renvoie l'utilisateur sur le dashboard."""
    if error or not code or not state:
        return _back("error", error or "refused")
    try:
        gcal.handle_callback(code, gcal.read_state(state))
    except gcal.CalendarError as exc:
        log.warning("Connexion Google Agenda échouée : %s", exc)
        return _back("error", "failed")
    return _back("connected")


@router.post("/sync", response_model=CalendarSyncResult)
def sync_all(user: AuthUser = Depends(current_user)):
    """Crée ou met à jour les rappels de tous les posts non publiés qui ont une date."""
    if not gcal.status(user.uid)["connected"]:
        raise HTTPException(409, "Google Agenda n'est pas connecté.")
    tz = load_profile(user.uid, user.email).timezone
    result = CalendarSyncResult(connected=True)
    for snap in sub(user.uid, "posts").stream():
        post = with_id(snap)
        if post.get("status") == "published" or not post.get("scheduled_for"):
            continue
        try:
            event_id = gcal.upsert_event(user.uid, post, tz)
        except gcal.NotConnected as exc:
            raise HTTPException(409, str(exc))
        except gcal.CalendarError as exc:
            result.error = str(exc)
            continue
        if event_id != post.get("calendar_event_id"):
            snap.reference.update({"calendar_event_id": event_id})
        result.synced += 1
    return result


@router.delete("", status_code=204)
def disconnect(user: AuthUser = Depends(current_user)):
    """Déconnecte Google Agenda et supprime les rappels déjà créés."""
    for snap in sub(user.uid, "posts").stream():
        event_id = (snap.to_dict() or {}).get("calendar_event_id")
        if event_id:
            try:
                gcal.delete_event(user.uid, event_id)
            except gcal.CalendarError as exc:
                log.info("Événement non supprimé : %s", exc)
            snap.reference.update({"calendar_event_id": None})
    gcal.disconnect(user.uid)
