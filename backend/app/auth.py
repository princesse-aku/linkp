import logging
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as fb_auth

from .firebase import init_firebase

log = logging.getLogger(__name__)
bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    uid: str
    email: str | None
    email_verified: bool
    name: str | None


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> AuthUser:
    """Valide le jeton Firebase (ID token) et renvoie l'utilisateur connecté."""
    if creds is None:
        raise HTTPException(status_code=401, detail="Authentification requise")
    init_firebase()
    try:
        decoded = fb_auth.verify_id_token(creds.credentials)
    except Exception as exc:  # jeton invalide, expiré, mal formé…
        log.info("Jeton refusé : %s", exc)
        raise HTTPException(status_code=401, detail="Jeton invalide ou expiré")
    return AuthUser(
        uid=decoded["uid"],
        email=decoded.get("email"),
        email_verified=bool(decoded.get("email_verified")),
        name=decoded.get("name"),
    )
