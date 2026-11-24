"""Données de l'espace admin : comptes (Firebase Auth), activité (journal) et indicateurs.

Rien de ce qui est renvoyé ici ne contient de contenu utilisateur : ni posts, ni profil, ni exemples, ni clés ou jetons.
On ne renvoie que des existences (oui ou non) et des quantités.
"""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from firebase_admin import auth as fb_auth
from google.cloud.firestore_v1.base_query import FieldFilter

from ..firebase import db, init_firebase
from ..store import now, sub, user_doc
from .activity import EVENTS


def _ms(ts: int | None) -> datetime | None:
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc) if ts else None


def _last_active(rec: fb_auth.UserRecord) -> datetime | None:
    meta = rec.user_metadata
    stamps = [t for t in (getattr(meta, "last_refresh_timestamp", None), meta.last_sign_in_timestamp) if t]
    return _ms(max(stamps)) if stamps else None


def _account(rec: fb_auth.UserRecord) -> dict:
    return {
        "uid": rec.uid,
        "email": rec.email,
        "verified": bool(rec.email_verified),
        "disabled": bool(rec.disabled),
        "providers": sorted({p.provider_id for p in rec.provider_data}),
        "created_at": _ms(rec.user_metadata.creation_timestamp),
        "last_active_at": _last_active(rec),
    }


def _count(query) -> int:
    return int(query.count().get()[0][0].value)


def _flags(uids: list[str]) -> dict[str, dict]:
    """Clé IA et agenda connectés, d'après l'existence des documents (leur contenu n'est jamais lu)."""
    refs, owners = [], []
    for uid in uids:
        private = user_doc(uid).collection("private")
        refs += [private.document("rodium"), private.document("google")]
        owners += [(uid, "has_key"), (uid, "has_calendar")]
    out = {uid: {"has_key": False, "has_calendar": False} for uid in uids}
    by_path = {r.path: o for r, o in zip(refs, owners)}
    for snap in db().get_all(refs, field_paths=["saved_at", "connected_at"]):
        if snap.exists:
            uid, flag = by_path[snap.reference.path]
            out[uid][flag] = True
    return out


def overview() -> dict:
    init_firebase()
    accounts = [_account(u) for u in fb_auth.list_users().iterate_all()]
    uids = {a["uid"] for a in accounts}
    t = now()

    def since(days: int) -> datetime:
        return t - timedelta(days=days)

    # Inscriptions par jour sur 30 jours
    per_day = Counter(a["created_at"].date().isoformat() for a in accounts if a["created_at"] and a["created_at"] >= since(30))
    days = [(t - timedelta(days=i)).date().isoformat() for i in range(29, -1, -1)]

    # Clés et agendas : on liste seulement les références (aucun champ n'est lu)
    with_key = with_calendar = 0
    for ref in db().collection_group("private").select([]).stream():
        uid = ref.reference.parent.parent.id
        if uid in uids:
            with_key += ref.id == "rodium"
            with_calendar += ref.id == "google"

    # Générations (journal d'activité)
    runs7 = runs30 = created30 = failed30 = 0
    generated_uids: set[str] = set()
    errors: Counter = Counter()
    gen = db().collection(EVENTS).where(filter=FieldFilter("type", "==", "generation")).select(["uid", "at", "meta"])
    for snap in gen.stream():
        e = snap.to_dict() or {}
        meta = e.get("meta") or {}
        if meta.get("created"):
            generated_uids.add(e.get("uid"))
        if e.get("at") and e["at"] >= since(30):
            runs30 += 1
            created30 += meta.get("created", 0)
            failed30 += meta.get("failed", 0)
            errors.update(meta.get("errors") or {})
            runs7 += e["at"] >= since(7)

    total = len(accounts)
    return {
        "generated_at": t,
        "users": {
            "total": total,
            "verified": sum(a["verified"] for a in accounts),
            "active_7d": sum(1 for a in accounts if a["last_active_at"] and a["last_active_at"] >= since(7)),
            "active_30d": sum(1 for a in accounts if a["last_active_at"] and a["last_active_at"] >= since(30)),
            "new_7d": sum(1 for a in accounts if a["created_at"] and a["created_at"] >= since(7)),
        },
        "funnel": {
            "signed_up": total,
            "with_key": with_key,
            "generated": len(generated_uids & uids),
            "with_calendar": with_calendar,
        },
        "signups_by_day": [{"day": d, "count": per_day.get(d, 0)} for d in days],
        "posts_total": _count(db().collection_group("posts")),
        "generation_30d": {"runs": runs30, "runs_7d": runs7, "posts_created": created30, "posts_failed": failed30, "errors": dict(errors)},
    }


def list_accounts(page_token: str | None, limit: int = 25, query: str | None = None) -> dict:
    init_firebase()
    if query and "@" in query:
        try:
            records, token = [fb_auth.get_user_by_email(query.strip())], None
        except fb_auth.UserNotFoundError:
            records, token = [], None
    else:
        page = fb_auth.list_users(page_token=page_token or None, max_results=limit)
        records, token = page.users, page.next_page_token or None

    accounts = [_account(r) for r in records]
    flags = _flags([a["uid"] for a in accounts]) if accounts else {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        posts = list(pool.map(lambda a: _count(sub(a["uid"], "posts")), accounts))
    for a, n in zip(accounts, posts):
        a.update(flags[a["uid"]], posts=n)
    accounts.sort(key=lambda a: a["created_at"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return {"users": accounts, "next_page_token": token}


def _event(snap) -> dict:
    e = snap.to_dict() or {}
    return {"id": snap.id, "uid": e.get("uid"), "type": e.get("type"), "at": e.get("at"), "meta": e.get("meta") or {}}


def user_detail(uid: str) -> dict | None:
    init_firebase()
    try:
        account = _account(fb_auth.get_user(uid))
    except fb_auth.UserNotFoundError:
        return None
    account.update(_flags([uid])[uid])

    statuses: Counter = Counter()
    for snap in sub(uid, "posts").select(["status"]).stream():
        statuses[(snap.to_dict() or {}).get("status", "draft")] += 1
    profile = user_doc(uid).get().to_dict() or {}
    account["posts"] = {"total": sum(statuses.values()), **statuses}
    account["examples"] = _count(sub(uid, "examples"))
    # Étapes franchies : oui ou non seulement, jamais le contenu
    account["setup"] = {
        "profile_filled": bool(profile.get("job_title") or profile.get("industry") or profile.get("bio")),
        "themes": bool(profile.get("themes")),
        "period": bool(profile.get("start_date") and profile.get("end_date")),
        "style_analyzed": bool(profile.get("style_analysis")),
    }
    account["events"] = events(uid=uid, limit=100)["events"]
    return account


def events(*, uid: str | None = None, type: str | None = None, errors_only: bool = False, limit: int = 100) -> dict:
    init_firebase()
    q = db().collection(EVENTS)
    if uid:
        q = q.where(filter=FieldFilter("uid", "==", uid))
    if type:
        q = q.where(filter=FieldFilter("type", "==", type))
    q = q.order_by("at", direction="DESCENDING").limit(min(limit, 300) * (3 if errors_only else 1))
    items = [_event(s) for s in q.stream()]
    if errors_only:
        items = [e for e in items if e["meta"].get("ok") is False or e["meta"].get("errors") or e["meta"].get("error")][:limit]

    # Adresse email de chaque utilisateur cité, en un seul appel
    wanted = sorted({e["uid"] for e in items if e["uid"]})
    emails: dict[str, str | None] = {}
    for i in range(0, len(wanted), 100):
        res = fb_auth.get_users([fb_auth.UidIdentifier(u) for u in wanted[i : i + 100]])
        emails.update({u.uid: u.email for u in res.users})
    for e in items:
        e["email"] = emails.get(e["uid"])
    return {"events": items}
