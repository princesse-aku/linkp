from fastapi import APIRouter, Depends, HTTPException

from ..auth import AuthUser, require_admin
from ..services import admin as svc

# Tout ce routeur est réservé aux adresses de ADMIN_EMAILS (404 pour les autres).
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/me")
def me(user: AuthUser = Depends(require_admin)):
    return {"admin": True, "email": user.email}


@router.get("/overview")
def overview():
    return svc.overview()


@router.get("/users")
def users(page_token: str | None = None, q: str | None = None, limit: int = 25):
    return svc.list_accounts(page_token, max(1, min(limit, 100)), q)


@router.get("/users/{uid}")
def user(uid: str):
    detail = svc.user_detail(uid)
    if detail is None:
        raise HTTPException(404, "Utilisateur introuvable.")
    return detail


@router.get("/events")
def events(type: str | None = None, errors_only: bool = False, limit: int = 100):
    return svc.events(type=type, errors_only=errors_only, limit=max(1, min(limit, 300)))
