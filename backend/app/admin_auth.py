"""Contrôle d'accès de l'espace admin, en trois niveaux cumulatifs.

  admin_identity  compte connecté, adresse vérifiée et autorisée (sinon 404 : la route se fait passer pour inexistante)
  admin_session   + code de confirmation saisi pour la connexion en cours (sinon 401 « admin_session_required »)
  superadmin      + rôle superadmin (sinon 403)
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request

from .auth import AuthUser, current_user
from .services import admin_access as access

SESSION_HEADER = "X-Admin-Session"


@dataclass
class AdminUser:
    user: AuthUser
    role: str

    @property
    def email(self) -> str:
        return (self.user.email or "").lower()


def admin_identity(user: AuthUser = Depends(current_user)) -> AdminUser:
    role = access.role_of(user.email) if user.email and user.email_verified else None
    if not role:
        raise HTTPException(status_code=404, detail="Not Found")
    return AdminUser(user, role)


def admin_session(request: Request, admin: AdminUser = Depends(admin_identity)) -> AdminUser:
    if not access.session_valid(request.headers.get(SESSION_HEADER), admin.user):
        raise HTTPException(status_code=401, detail="admin_session_required")
    return admin


def superadmin(admin: AdminUser = Depends(admin_session)) -> AdminUser:
    if admin.role != "superadmin":
        raise HTTPException(status_code=403, detail="Réservé aux superadmins.")
    return admin
