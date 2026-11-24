"""Journal d'activité : ce qui s'est passé sur LinkP, sans jamais enregistrer de contenu.

Collection `events` : { uid, type, at, meta }. `meta` ne contient que des compteurs et des types d'erreur
(jamais un texte de post, un thème, un profil, une clé ou un jeton). Consulté uniquement par l'admin.
"""
import logging

from ..firebase import db
from ..store import now
from . import ai

log = logging.getLogger(__name__)
EVENTS = "events"


def log_event(uid: str, type: str, **meta) -> None:
    """Enregistre un événement. Ne fait jamais échouer la requête de l'utilisateur."""
    try:
        db().collection(EVENTS).add({"uid": uid, "type": type, "at": now(), "meta": {k: v for k, v in meta.items() if v is not None}})
    except Exception:
        log.warning("Journal d'activité indisponible (%s)", type, exc_info=True)


def error_kind(exc: Exception) -> str:
    """Range une erreur d'IA dans une catégorie (le message, lui, n'est pas conservé)."""
    if isinstance(exc, ai.AIKeyRejected):
        return "key_rejected"
    text = str(exc)
    if text.startswith("Ton crédit"):
        return "credit"
    if "limite le nombre" in text:
        return "rate_limit"
    if "injoignable" in text:
        return "unreachable"
    if "vide" in text or "inattendue" in text or "JSON" in text:
        return "bad_output"
    return "other"
