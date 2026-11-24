from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..admin_auth import AdminUser, admin_session, superadmin
from ..services import activity
from ..services import admin as svc
from ..services import admin_access as access

router = APIRouter(prefix="/admin", tags=["admin"])


class CodeRequest(BaseModel):
    email: str = Field(max_length=254)


class CodeIn(BaseModel):
    email: str = Field(max_length=254)
    code: str = Field(max_length=20)


class AdminIn(BaseModel):
    email: str = Field(max_length=254)


# --- Connexion par code (publique : ne révèle pas quelles adresses sont administratrices) ------

@router.post("/login/code", status_code=202)
def send_code(body: CodeRequest):
    """Envoie un code à 6 chiffres à l'adresse si elle est administratrice. La réponse est la même dans tous les cas."""
    return access.send_code(body.email)


@router.post("/login/verify")
def verify_code(body: CodeIn):
    return access.verify_code(body.email, body.code)


@router.get("/me")
def me(admin: AdminUser = Depends(admin_session)):
    return {"email": admin.email, "role": admin.role}


# --- Données (session admin requise) ----------------------------------------------------

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
    activity.log_event(admin.actor, "admin_added", target=created["email"])
    return created


@router.delete("/admins/{email}", status_code=204)
def remove_admin(email: str, admin: AdminUser = Depends(superadmin)):
    access.remove_admin(email)
    activity.log_event(admin.actor, "admin_removed", target=access.normalize(email))
