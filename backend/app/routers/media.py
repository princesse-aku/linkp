from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import AuthUser, current_user
from ..config import settings
from ..schemas import MediaOut
from ..services import media as media_svc
from ..store import load_profile, sub, with_id

router = APIRouter(prefix="/media", tags=["médias"])


def _out(data: dict) -> MediaOut:
    return MediaOut.model_validate(data)


@router.get("", response_model=list[MediaOut])
def list_media(user: AuthUser = Depends(current_user)):
    docs = sub(user.uid, "media").order_by("created_at", direction="DESCENDING").stream()
    return [_out(with_id(d)) for d in docs]


@router.post("", response_model=MediaOut, status_code=201)
async def upload_media(file: UploadFile = File(...), user: AuthUser = Depends(current_user)):
    load_profile(user.uid, user.email)
    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)  # on ne charge jamais plus que la limite
    try:
        media_svc.validate(file.content_type, len(data))
        uploaded = media_svc.upload(user.uid, data, file.filename or "fichier", file.content_type or "")
    except media_svc.MediaError as exc:
        status = 503 if "configuré" in str(exc) else 400 if "Format" in str(exc) or "volumineux" in str(exc) else 502
        raise HTTPException(status, str(exc))
    return _out(media_svc.register(user.uid, uploaded, file.filename or ""))


@router.delete("/{media_id}", status_code=204)
def delete_media(media_id: str, user: AuthUser = Depends(current_user)):
    ref = sub(user.uid, "media").document(media_id)
    snap = ref.get()
    if not snap.exists:
        return
    data = snap.to_dict() or {}
    try:
        media_svc.destroy(data.get("public_id", ""), data.get("resource_type", "image"))
    except media_svc.MediaError as exc:
        raise HTTPException(502, str(exc))
    ref.delete()
