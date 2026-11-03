"""Emails d'authentification envoyés par LinkP (Resend en production, Mailpit en dev).

Les liens (vérification, mot de passe oublié) sont générés par Firebase Admin,
puis envoyés par notre propre service d'email au lieu de celui de Firebase.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth as fb_auth

from ..auth import AuthUser, current_user
from ..config import settings
from ..firebase import init_firebase
from ..schemas import PasswordResetIn
from ..services import email as mail

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def _action_settings() -> fb_auth.ActionCodeSettings:
    return fb_auth.ActionCodeSettings(url=f"{settings.frontend_origin.rstrip('/')}/login", handle_code_in_app=False)


@router.post("/welcome", status_code=202)
def welcome(user: AuthUser = Depends(current_user)):
    """Envoie l'email de bienvenue (avec le lien de confirmation si l'adresse n'est pas vérifiée)."""
    if not user.email:
        raise HTTPException(400, "Ce compte n'a pas d'adresse email.")
    init_firebase()
    verify_url = None
    if not user.email_verified:
        try:
            verify_url = fb_auth.generate_email_verification_link(user.email, _action_settings())
        except Exception as exc:
            log.warning("Lien de vérification indisponible : %s", exc)
    subject, html, text = mail.welcome_email(user.name, verify_url)
    try:
        mail.send_email(user.email, subject, html, text)
    except mail.EmailError as exc:
        raise HTTPException(502, str(exc))
    return {"sent": True}


@router.post("/resend-verification", status_code=202)
def resend_verification(user: AuthUser = Depends(current_user)):
    if not user.email:
        raise HTTPException(400, "Ce compte n'a pas d'adresse email.")
    if user.email_verified:
        return {"sent": False, "detail": "Adresse déjà confirmée."}
    init_firebase()
    try:
        url = fb_auth.generate_email_verification_link(user.email, _action_settings())
    except Exception as exc:
        log.warning("Lien de vérification indisponible : %s", exc)
        raise HTTPException(502, "Impossible de générer le lien de confirmation.")
    try:
        mail.send_email(user.email, *mail.verification_email(url))
    except mail.EmailError as exc:
        raise HTTPException(502, str(exc))
    return {"sent": True}


@router.post("/password-reset", status_code=202)
def password_reset(body: PasswordResetIn):
    """Répond toujours 202 : on ne révèle jamais si une adresse a un compte."""
    init_firebase()
    try:
        url = fb_auth.generate_password_reset_link(body.email, _action_settings())
        mail.send_email(body.email, *mail.password_reset_email(url))
    except fb_auth.UserNotFoundError:
        pass
    except mail.EmailError as exc:
        log.error("Envoi de l'email de réinitialisation impossible : %s", exc)
    except Exception as exc:
        log.warning("Réinitialisation impossible pour une adresse : %s", exc)
    return {"ok": True}
