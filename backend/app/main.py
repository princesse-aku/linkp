from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, engine
from .routers import posts, profile

Base.metadata.create_all(engine)  # TODO: passer à Alembic quand le schéma se stabilise

app = FastAPI(title="LinkP API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(profile.router, prefix="/api")
app.include_router(posts.router, prefix="/api")


@app.get("/health")
def health():
    return {"ok": True}
