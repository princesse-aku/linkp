from fastapi import APIRouter, Depends, HTTPException

from ..auth import AuthUser, current_user
from ..schemas import StyleAnalysis, ThemeSuggestions
from ..services import ai
from ..store import load_examples, load_profile, user_doc

router = APIRouter(prefix="/ai", tags=["ia"])


@router.post("/analyze-style", response_model=StyleAnalysis)
def analyze_style(user: AuthUser = Depends(current_user)):
    """Analyse les posts d'exemple et mémorise le style pour les prochaines rédactions."""
    profile = load_profile(user.uid, user.email)
    examples = load_examples(user.uid)
    if not examples:
        raise HTTPException(400, "Ajoute au moins un post d'exemple pour analyser ton style.")
    analysis = ai.analyze_style(profile, examples)
    user_doc(user.uid).set({"style_analysis": analysis.model_dump()}, merge=True)
    return analysis


@router.post("/suggest-themes", response_model=ThemeSuggestions)
def suggest_themes(user: AuthUser = Depends(current_user)):
    profile = load_profile(user.uid, user.email)
    if not (profile.job_title or profile.industry or profile.bio):
        raise HTTPException(400, "Renseigne ton poste, ton secteur ou ta présentation pour recevoir des idées.")
    return ThemeSuggestions(themes=ai.suggest_themes(profile))
