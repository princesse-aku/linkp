"""Contrôle d'accès de l'espace admin.

Pas de compte ni de mot de passe : on prouve qu'on contrôle l'adresse en saisissant le code reçu par email, et le serveur remet une
session signée (en-tête X-Admin-Session). Sans session valide : 401 « admin_session_required ». Le rôle est relu à chaque appel.
  admin_session   session valide d'un admin ou d'un superadmin
  superadmin      + rôle superadmin (sinon 403)
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request

from .services import admin_access as access

SESSION_HEADER = "X-Admin-Session"


@dataclass
class AdminUser:
    email: str
    role: str

    @property
    def actor(self) -> str:
        return access.actor(self.email)


def admin_session(request: Request) -> AdminUser:
    found = access.session_identity(request.headers.get(SESSION_HEADER))
    if not found:
        raise HTTPException(status_code=401, detail="admin_session_required")
    return AdminUser(*found)


def superadmin(admin: AdminUser = Depends(admin_session)) -> AdminUser:
    if admin.role != "superadmin":
        raise HTTPException(status_code=403, detail="Réservé aux superadmins.")
    return admin
