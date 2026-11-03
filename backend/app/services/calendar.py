"""Google Agenda : connexion OAuth par utilisateur et rappels automatiques des posts programmés."""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt

from ..config import settings
from ..store import now, user_doc

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
API = "https://www.googleapis.com/calendar/v3"
SCOPES = "openid email https://www.googleapis.com/auth/calendar.events"


class CalendarError(Exception):
    pass


class NotConnected(CalendarError):
    pass


def configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def redirect_uri() -> str:
    return f"{settings.backend_public_url.rstrip('/')}/api/calendar/callback"


def _token_doc(uid: str):
    return user_doc(uid).collection("private").document("google")


# --- OAuth -----------------------------------------------------------------

def make_state(uid: str) -> str:
    payload = {"uid": uid, "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def read_state(state: str) -> str:
    try:
        return jwt.decode(state, settings.secret_key, algorithms=["HS256"])["uid"]
    except (jwt.PyJWTError, KeyError) as exc:
        raise CalendarError("État OAuth invalide ou expiré.") from exc


def auth_url(uid: str) -> str:
    if not configured():
        raise CalendarError("Google Agenda n'est pas configuré (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).")
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": make_state(uid),
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def _post_token(data: dict) -> dict:
    try:
        r = httpx.post(
            TOKEN_URL,
            data={"client_id": settings.google_client_id, "client_secret": settings.google_client_secret, **data},
            timeout=15,
        )
    except httpx.HTTPError as exc:
        raise CalendarError(f"Google injoignable : {exc}") from exc
    body = r.json() if r.content else {}
    if r.status_code >= 400:
        if body.get("error") == "invalid_grant":
            raise NotConnected("L'accès à Google Agenda a été révoqué. Reconnecte-le.")
        raise CalendarError(f"Google a refusé la requête : {body.get('error_description') or r.text[:200]}")
    return body


def handle_callback(code: str, uid: str) -> None:
    tokens = _post_token({"code": code, "grant_type": "authorization_code", "redirect_uri": redirect_uri()})
    if not tokens.get("refresh_token"):
        raise CalendarError("Google n'a pas fourni de jeton de rafraîchissement. Réessaie la connexion.")
    email = None
    if tokens.get("id_token"):
        email = jwt.decode(tokens["id_token"], options={"verify_signature": False}).get("email")
    _token_doc(uid).set(
        {
            "refresh_token": tokens["refresh_token"],
            "access_token": tokens.get("access_token"),
            "expires_at": now() + timedelta(seconds=int(tokens.get("expires_in", 3600))),
            "email": email,
            "connected_at": now(),
        }
    )


def status(uid: str) -> dict:
    snap = _token_doc(uid).get()
    data = snap.to_dict() if snap.exists else None
    return {"configured": configured(), "connected": bool(data), "email": (data or {}).get("email")}


def disconnect(uid: str) -> None:
    snap = _token_doc(uid).get()
    if snap.exists:
        token = (snap.to_dict() or {}).get("refresh_token")
        if token:
            try:
                httpx.post(REVOKE_URL, data={"token": token}, timeout=10)
            except httpx.HTTPError:
                pass  # la révocation côté Google est facultative
        _token_doc(uid).delete()


def _access_token(uid: str) -> str:
    snap = _token_doc(uid).get()
    if not snap.exists:
        raise NotConnected("Google Agenda n'est pas connecté.")
    data = snap.to_dict() or {}
    expires = data.get("expires_at")
    if data.get("access_token") and expires and expires > now() + timedelta(seconds=60):
        return data["access_token"]
    try:
        tokens = _post_token({"refresh_token": data["refresh_token"], "grant_type": "refresh_token"})
    except NotConnected:
        _token_doc(uid).delete()
        raise
    _token_doc(uid).update(
        {"access_token": tokens["access_token"], "expires_at": now() + timedelta(seconds=int(tokens.get("expires_in", 3600)))}
    )
    return tokens["access_token"]


# --- Événements ------------------------------------------------------------

def _request(uid: str, method: str, path: str, **kwargs) -> httpx.Response:
    try:
        return httpx.request(
            method, f"{API}{path}", headers={"Authorization": f"Bearer {_access_token(uid)}"}, timeout=15, **kwargs
        )
    except httpx.HTTPError as exc:
        raise CalendarError(f"Google Agenda injoignable : {exc}") from exc


def event_body(post: dict, tz: str) -> dict:
    start = datetime.fromisoformat(post["scheduled_for"])
    end = start + timedelta(minutes=15)
    link = f"{settings.frontend_origin.rstrip('/')}/dashboard"
    return {
        "summary": f"Publier sur LinkedIn : {post.get('theme') or 'post'}",
        "description": f"{post.get('content', '')}\n\n--\nGéré avec LinkP : {link}",
        "start": {"dateTime": start.isoformat(), "timeZone": tz},
        "end": {"dateTime": end.isoformat(), "timeZone": tz},
        "reminders": {
            "useDefault": False,
            "overrides": [{"method": "popup", "minutes": 30}, {"method": "email", "minutes": 60}],
        },
        "extendedProperties": {"private": {"linkpPostId": str(post.get("id", ""))}},
    }


def upsert_event(uid: str, post: dict, tz: str) -> str:
    """Crée ou met à jour l'événement d'un post et renvoie son identifiant."""
    if not post.get("scheduled_for"):
        raise CalendarError("Ce post n'a pas de date de publication.")
    body = event_body(post, tz)
    event_id = post.get("calendar_event_id")
    if event_id:
        r = _request(uid, "PATCH", f"/calendars/primary/events/{event_id}", json=body)
        if r.status_code in (404, 410):
            event_id = None  # supprimé côté Google : on le recrée
        elif r.status_code >= 400:
            raise CalendarError(f"Mise à jour de l'événement refusée ({r.status_code}).")
        else:
            return event_id
    r = _request(uid, "POST", "/calendars/primary/events", json=body)
    if r.status_code >= 400:
        raise CalendarError(f"Création de l'événement refusée ({r.status_code}) : {r.text[:200]}")
    return r.json()["id"]


def delete_event(uid: str, event_id: str) -> None:
    r = _request(uid, "DELETE", f"/calendars/primary/events/{event_id}")
    if r.status_code >= 400 and r.status_code not in (404, 410):
        raise CalendarError(f"Suppression de l'événement refusée ({r.status_code}).")
