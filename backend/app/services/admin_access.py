"""Accès à l'espace admin : rôles, code de connexion par email et session.

Rôles
  superadmin  adresses de SUPERADMIN_EMAILS : gèrent les autres admins, jamais retirables depuis l'interface.
  admin       adresses de ADMIN_EMAILS (fixes) ou ajoutées par un superadmin (collection `admins`).

Connexion admin sans mot de passe : on saisit son adresse, un code à 6 chiffres est envoyé à cette adresse, et une fois le code saisi
le serveur remet une session signée (12 h). Aucun compte Firebase n'est nécessaire : la boîte mail fait foi.
Le code n'est jamais stocké en clair (empreinte HMAC), expire vite, ne sert qu'une fois et n'accepte que quelques essais.
La demande de code répond toujours de la même façon, que l'adresse soit administratrice ou non (pas de moyen de deviner qui l'est).
"""
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

import jwt
from fastapi import HTTPException
from google.cloud import firestore

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


# --- Code de connexion ------------------------------------------------------------------------

def actor(email: str) -> str:
    """Identifiant d'un admin dans le journal d'activité (il n'a pas forcément de compte Firebase)."""
    return f"admin:{normalize(email)}"


def _challenge(email: str):
    return db().collection(CHALLENGES).document(hashlib.sha256(normalize(email).encode()).hexdigest())


def _digest(email: str, code: str) -> str:
    return hmac.new(settings.secret_key.encode(), f"{normalize(email)}:{code}".encode(), hashlib.sha256).hexdigest()


def _valid_email(e: str) -> bool:
    return bool(_EMAIL.match(e)) and len(e) <= 254


def send_code(email: str) -> dict:
    """Envoie un code si l'adresse est administratrice. Répond pareil dans tous les cas."""
    e = normalize(email)
    answer = {"sent": True, "expires_in": int(CODE_TTL.total_seconds()), "retry_after": int(RESEND_COOLDOWN.total_seconds())}
    if not _valid_email(e) or not role_of(e):
        return answer
    ref = _challenge(e)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else None
    if data and data.get("sent_at") and now() - data["sent_at"] < RESEND_COOLDOWN:
        return answer  # un code vient d'être envoyé : on n'en renvoie pas un autre

    code = f"{secrets.randbelow(10**6):06d}"
    ref.set({"code_hash": _digest(e, code), "expires_at": now() + CODE_TTL, "attempts": 0, "sent_at": now()})
    try:
        mail.send_email(e, *mail.admin_code_email(code, int(CODE_TTL.total_seconds() // 60)))
    except mail.EmailError:
        ref.delete()
        raise
    return answer


@firestore.transactional
def _check(tx, ref, email: str, code: str) -> str | None:
    """Renvoie None si le code est bon, sinon un motif d'échec. Compte l'essai dans la même transaction."""
    snap = ref.get(transaction=tx)
    if not snap.exists:
        return "none"
    d = snap.to_dict() or {}
    if d.get("expires_at") is None or d["expires_at"] < now():
        tx.delete(ref)
        return "expired"
    attempts = int(d.get("attempts", 0)) + 1
    if attempts > MAX_ATTEMPTS:
        tx.delete(ref)
        return "locked"
    if hmac.compare_digest(d.get("code_hash", ""), _digest(email, code)):
        tx.delete(ref)  # usage unique
        return None
    if attempts >= MAX_ATTEMPTS:
        tx.delete(ref)
        return "locked"
    tx.update(ref, {"attempts": attempts})
    return f"wrong:{MAX_ATTEMPTS - attempts}"


def verify_code(email: str, code: str) -> dict:
    e = normalize(email)
    code = re.sub(r"\s", "", code)
    role = role_of(e) if _valid_email(e) else None
    if not role:
        reason = "none"  # même réponse que pour un code expiré : on ne révèle pas si l'adresse est administratrice
    elif not re.fullmatch(r"\d{6}", code):
        reason = "format"
    else:
        reason = _check(db().transaction(), _challenge(e), e, code)

    if reason is None and role:
        activity.log_event(actor(e), "admin_login", role=role)
        return {"token": issue_session(e, role), "expires_in": int(SESSION_TTL.total_seconds()), "role": role, "email": e}

    if role:
        activity.log_event(actor(e), "admin_login_failed", reason=(reason or "none").split(":")[0])
    if reason == "format":
        raise HTTPException(422, "Le code contient 6 chiffres.")
    if reason in ("none", "expired"):
        raise HTTPException(400, "Ce code a expiré ou n'existe plus. Demande un nouveau code.")
    if reason == "locked":
        raise HTTPException(429, "Trop d'essais. Demande un nouveau code.")
    left = int(str(reason).split(":")[1])
    raise HTTPException(400, f"Code incorrect. Il te reste {left} essai{'s' if left > 1 else ''}.")


# --- Session ----------------------------------------------------------------------------------

def issue_session(email: str, role: str) -> str:
    t = now()
    payload = {"typ": "admin-session", "sub": normalize(email), "role": role, "iat": t, "exp": t + SESSION_TTL}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def session_identity(token: str | None) -> tuple[str, str] | None:
    """(email, rôle) d'une session valide. Le rôle est relu à chaque appel : retirer un admin coupe son accès tout de suite."""
    if not token:
        return None
    try:
        p = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if p.get("typ") != "admin-session" or not isinstance(p.get("sub"), str):
        return None
    role = role_of(p["sub"])
    return (p["sub"], role) if role else None
