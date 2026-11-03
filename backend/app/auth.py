import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from .config import settings

bearer = HTTPBearer()

# Les projets Supabase récents signent les tokens avec une clé asymétrique (JWKS) ;
# les anciens utilisent un secret partagé HS256.
_jwks = PyJWKClient(f"{settings.next_public_supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json")


def current_user_id(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    """Valide le JWT Supabase et renvoie l'id de l'utilisateur."""
    token = creds.credentials
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg == "HS256":
            key, algs = settings.supabase_jwt_secret, ["HS256"]
        else:
            key, algs = _jwks.get_signing_key_from_jwt(token).key, [alg]
        payload = jwt.decode(token, key, algorithms=algs, audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
    return payload["sub"]
