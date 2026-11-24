"""Accès à l'espace admin : rôles, code de confirmation par email et session.

Rôles
  superadmin  adresses de SUPERADMIN_EMAILS : gèrent les autres admins, jamais retirables depuis l'interface.
  admin       adresses de ADMIN_EMAILS (fixes) ou ajoutées par un superadmin (collection `admins`).

Connexion admin : après la connexion Firebase, un code à 6 chiffres est envoyé à l'adresse du compte. Une fois le code saisi,
le serveur remet une session signée, liée à CETTE connexion Firebase (champ auth_time) : une nouvelle connexion exige un nouveau code.
Le code n'est jamais stocké en clair (empreinte HMAC), expire vite, ne sert qu'une fois et n'accepte que quelques essais.
"""
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

import jwt
from fastapi import HTTPException
from google.cloud import firestore

from ..auth import AuthUser
from ..config import settings
from ..firebase import db
from ..store import now
from . import activity
from . import email as mail

ADMINS = "admins"
CHALLENGES = "admin_challenges"
CODE_TTL = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_ATTEMPTS = 5
SESSION_TTL = timedelta(hours=12)
_EMAIL = re.compile(r"^[^@\s/]+@[^@\s/]+\.[^@\s/]+$")


# --- Rôles ------------------------------------------------------------------------------------

def normalize(email: str) -> str:
    return email.strip().lower()


def role_of(email: str | None) -> str | None:
    """'superadmin', 'admin' ou None."""
    if not email:
        return None
    e = normalize(email)
    if e in settings.superadmin_email_list:
        return "superadmin"
    if e in settings.admin_email_list or db().collection(ADMINS).document(e).get().exists:
        return "admin"
    return None


def list_admins() -> list[dict]:
    rows = [{"email": e, "role": "superadmin", "removable": False, "source": "config"} for e in settings.superadmin_email_list]
    rows += [
        {"email": e, "role": "admin", "removable": False, "source": "config"}
        for e in settings.admin_email_list
        if e not in settings.superadmin_email_list
    ]
    taken = {r["email"] for r in rows}
    for snap in db().collection(ADMINS).stream():
        if snap.id in taken:
            continue
        d = snap.to_dict() or {}
        rows.append({"email": snap.id, "role": "admin", "removable": True, "source": "database", "added_by": d.get("added_by"), "added_at": d.get("added_at")})
    return rows


def add_admin(email: str, by: str) -> dict:
    e = normalize(email)
    if not _EMAIL.match(e) or len(e) > 254:
        raise HTTPException(422, "Adresse email invalide.")
    if role_of(e):
        raise HTTPException(409, "Cette adresse est déjà administratrice.")
    db().collection(ADMINS).document(e).set({"added_by": by, "added_at": now()})
    return {"email": e, "role": "admin", "removable": True, "source": "database", "added_by": by}


def remove_admin(email: str) -> None:
    e = normalize(email)
    if e in settings.superadmin_email_list or e in settings.admin_email_list:
        raise HTTPException(409, "Cet administrateur est défini dans la configuration du serveur : il ne peut pas être retiré ici.")
    ref = db().collection(ADMINS).document(e)
    if not ref.get().exists:
        raise HTTPException(404, "Administrateur introuvable.")
    ref.delete()


# --- Code de confirmation ---------------------------------------------------------------------

def _digest(uid: str, auth_time: int, code: str) -> str:
    return hmac.new(settings.secret_key.encode(), f"{uid}:{auth_time}:{code}".encode(), hashlib.sha256).hexdigest()


def send_code(user: AuthUser) -> dict:
    """Génère un code, le stocke sous forme d'empreinte et l'envoie par email."""
    ref = db().collection(CHALLENGES).document(user.uid)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else None
    if data and data.get("auth_time") == user.auth_time and data.get("sent_at") and now() - data["sent_at"] < RESEND_COOLDOWN:
        wait = int((RESEND_COOLDOWN - (now() - data["sent_at"])).total_seconds()) + 1
        raise HTTPException(429, f"Un code vient d'être envoyé. Patiente {wait} s avant d'en demander un autre.", headers={"Retry-After": str(wait)})

    code = f"{secrets.randbelow(10**6):06d}"
    ref.set({"code_hash": _digest(user.uid, user.auth_time, code), "auth_time": user.auth_time, "expires_at": now() + CODE_TTL, "attempts": 0, "sent_at": now()})
    try:
        mail.send_email(user.email or "", *mail.admin_code_email(code, int(CODE_TTL.total_seconds() // 60)))
    except mail.EmailError:
        ref.delete()
        raise
    return {"sent": True, "expires_in": int(CODE_TTL.total_seconds()), "retry_after": int(RESEND_COOLDOWN.total_seconds())}


@firestore.transactional
def _check(tx, ref, user: AuthUser, code: str) -> str | None:
    """Renvoie None si le code est bon, sinon un motif d'échec. Compte l'essai dans la même transaction."""
    snap = ref.get(transaction=tx)
    if not snap.exists:
        return "none"
    d = snap.to_dict() or {}
    if d.get("auth_time") != user.auth_time or d.get("expires_at") is None or d["expires_at"] < now():
        tx.delete(ref)
        return "expired"
    attempts = int(d.get("attempts", 0)) + 1
    if attempts > MAX_ATTEMPTS:
        tx.delete(ref)
        return "locked"
    if hmac.compare_digest(d.get("code_hash", ""), _digest(user.uid, user.auth_time, code)):
        tx.delete(ref)  # usage unique
        return None
    if attempts >= MAX_ATTEMPTS:
        tx.delete(ref)
        return "locked"
    tx.update(ref, {"attempts": attempts})
    return f"wrong:{MAX_ATTEMPTS - attempts}"


def verify_code(user: AuthUser, role: str, code: str) -> dict:
    code = re.sub(r"\s", "", code)
    ref = db().collection(CHALLENGES).document(user.uid)
    reason = _check(db().transaction(), ref, user, code) if re.fullmatch(r"\d{6}", code) else "format"
    if reason is None:
        activity.log_event(user.uid, "admin_login", role=role)
        return {"token": issue_session(user, role), "expires_in": int(SESSION_TTL.total_seconds()), "role": role}

    activity.log_event(user.uid, "admin_login_failed", reason=reason.split(":")[0])
    if reason == "format":
        raise HTTPException(422, "Le code contient 6 chiffres.")
    if reason in ("none", "expired"):
        raise HTTPException(400, "Ce code a expiré ou n'existe plus. Demande un nouveau code.")
    if reason == "locked":
        raise HTTPException(429, "Trop d'essais. Demande un nouveau code.")
    left = int(reason.split(":")[1])
    raise HTTPException(400, f"Code incorrect. Il te reste {left} essai{'s' if left > 1 else ''}.")


# --- Session ----------------------------------------------------------------------------------

def issue_session(user: AuthUser, role: str) -> str:
    t = now()
    payload = {"typ": "admin-session", "sub": user.uid, "email": user.email, "role": role, "auth_time": user.auth_time, "iat": t, "exp": t + SESSION_TTL}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def session_valid(token: str | None, user: AuthUser) -> bool:
    """La session doit être signée par nous, appartenir à cet utilisateur et à sa connexion Firebase actuelle."""
    if not token:
        return False
    try:
        p = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        return False
    return p.get("typ") == "admin-session" and p.get("sub") == user.uid and p.get("auth_time") == user.auth_time
