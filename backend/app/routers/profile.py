from fastapi import APIRouter, Depends, HTTPException

from ..auth import AuthUser, current_user
from ..schemas import ExampleIn, ExampleOut, ProfileIn, ProfileOut
from ..store import load_profile, now, sub, user_doc

router = APIRouter(tags=["profil"])

MAX_EXAMPLES = 30


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: AuthUser = Depends(current_user)):
    return load_profile(user.uid, user.email)


@router.put("/profile", response_model=ProfileOut)
def save_profile(data: ProfileIn, user: AuthUser = Depends(current_user)):
    if data.start_date and data.end_date and data.end_date < data.start_date:
        raise HTTPException(422, "La date de fin précède la date de début.")
    load_profile(user.uid, user.email)  # crée le document au besoin
    user_doc(user.uid).set({**data.model_dump(mode="json"), "updated_at": now()}, merge=True)
    return load_profile(user.uid)


@router.get("/examples", response_model=list[ExampleOut])
def list_examples(user: AuthUser = Depends(current_user)):
    docs = sub(user.uid, "examples").order_by("created_at", direction="DESCENDING").stream()
    return [ExampleOut(id=d.id, content=(d.to_dict() or {}).get("content", "")) for d in docs]


@router.post("/examples", response_model=ExampleOut, status_code=201)
def add_example(data: ExampleIn, user: AuthUser = Depends(current_user)):
    load_profile(user.uid, user.email)
    col = sub(user.uid, "examples")
    if len(list(col.limit(MAX_EXAMPLES).stream())) >= MAX_EXAMPLES:
        raise HTTPException(409, f"Tu as atteint la limite de {MAX_EXAMPLES} exemples.")
    _, ref = col.add({"content": data.content.strip(), "created_at": now()})
    return ExampleOut(id=ref.id, content=data.content.strip())


@router.delete("/examples/{example_id}", status_code=204)
def delete_example(example_id: str, user: AuthUser = Depends(current_user)):
    sub(user.uid, "examples").document(example_id).delete()
