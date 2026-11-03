from fastapi import APIRouter, Depends, HTTPException

from ..auth import AuthUser, current_user
from ..schemas import AiKeyIn, AiKeyStatus, StyleAnalysis, ThemeSuggestions
from ..services import ai, keys
from ..store import load_examples, load_profile, user_doc

router = APIRouter(prefix="/ai", tags=["ia"])


# --- Clé RodiumAI de l'utilisateur -------------------------------------------

@router.get("/key", response_model=AiKeyStatus)
def key_status(user: AuthUser = Depends(current_user)):
    """Indique si une clé est enregistrée (jamais la clé elle-même, seulement ses 4 derniers caractères)."""
    return keys.status(user.uid)


@router.put("/key", response_model=AiKeyStatus)
def save_key(body: AiKeyIn, user: AuthUser = Depends(current_user)):
    """Vérifie la clé auprès de RodiumAI, puis l'enregistre chiffrée."""
    ai.validate_key(body.api_key)
    keys.save_key(user.uid, body.api_key)
    return keys.status(user.uid)


@router.delete("/key", status_code=204)
def remove_key(user: AuthUser = Depends(current_user)):
    keys.delete_key(user.uid)


# --- Fonctions IA (toutes utilisent la clé de l'utilisateur) ----------------

@router.post("/analyze-style", response_model=StyleAnalysis)
def analyze_style(user: AuthUser = Depends(current_user)):
    """Analyse les posts d'exemple et mémorise le style pour les prochaines rédactions."""
    api_key = keys.require_key(user.uid)
    profile = load_profile(user.uid, user.email)
    examples = load_examples(user.uid)
    if not examples:
        raise HTTPException(400, "Ajoute au moins un post d'exemple pour analyser ton style.")
    analysis = ai.analyze_style(profile, examples, api_key=api_key)
    user_doc(user.uid).set({"style_analysis": analysis.model_dump()}, merge=True)
    return analysis


@router.post("/suggest-themes", response_model=ThemeSuggestions)
def suggest_themes(user: AuthUser = Depends(current_user)):
    api_key = keys.require_key(user.uid)
    profile = load_profile(user.uid, user.email)
    if not (profile.job_title or profile.industry or profile.bio):
        raise HTTPException(400, "Renseigne ton poste, ton secteur ou ta présentation pour recevoir des idées.")
    return ThemeSuggestions(themes=ai.suggest_themes(profile, api_key=api_key))
