from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..admin_auth import SESSION_HEADER, AdminUser, admin_identity, admin_session, superadmin
from ..services import activity
from ..services import admin as svc
from ..services import admin_access as access

router = APIRouter(prefix="/admin", tags=["admin"])


class CodeIn(BaseModel):
    code: str = Field(max_length=20)


class AdminIn(BaseModel):
    email: str = Field(max_length=254)


# --- Identité et confirmation par code (réservées aux adresses autorisées) --------------------

@router.get("/me")
def me(request: Request, admin: AdminUser = Depends(admin_identity)):
    """Rôle de l'utilisateur et indique si le code de confirmation a déjà été saisi pour cette connexion."""
    return {
        "email": admin.user.email,
        "role": admin.role,
        "session": access.session_valid(request.headers.get(SESSION_HEADER), admin.user),
    }


@router.post("/session/code", status_code=202)
def send_code(admin: AdminUser = Depends(admin_identity)):
    """Envoie un code à 6 chiffres à l'adresse du compte."""
    return access.send_code(admin.user)


@router.post("/session/verify")
def verify_code(body: CodeIn, admin: AdminUser = Depends(admin_identity)):
    return access.verify_code(admin.user, admin.role, body.code)


# --- Données (code de confirmation requis) ----------------------------------------------------

@router.get("/overview", dependencies=[Depends(admin_session)])
def overview():
    return svc.overview()


@router.get("/users", dependencies=[Depends(admin_session)])
def users(page_token: str | None = None, q: str | None = None, limit: int = 25):
    return svc.list_accounts(page_token, max(1, min(limit, 100)), q)


@router.get("/users/{uid}", dependencies=[Depends(admin_session)])
def user(uid: str):
    detail = svc.user_detail(uid)
    if detail is None:
        raise HTTPException(404, "Utilisateur introuvable.")
    return detail


@router.get("/events", dependencies=[Depends(admin_session)])
def events(type: str | None = None, errors_only: bool = False, limit: int = 100):
    return svc.events(type=type, errors_only=errors_only, limit=max(1, min(limit, 300)))


# --- Gestion des administrateurs (superadmin) -------------------------------------------------

@router.get("/admins")
def admins(admin: AdminUser = Depends(superadmin)):
    return {"admins": access.list_admins()}


@router.post("/admins", status_code=201)
def add_admin(body: AdminIn, admin: AdminUser = Depends(superadmin)):
    created = access.add_admin(body.email, by=admin.email)
    activity.log_event(admin.user.uid, "admin_added", target=created["email"])
    return created


@router.delete("/admins/{email}", status_code=204)
def remove_admin(email: str, admin: AdminUser = Depends(superadmin)):
    access.remove_admin(email)
    activity.log_event(admin.user.uid, "admin_removed", target=access.normalize(email))
