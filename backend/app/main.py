import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .firebase import init_firebase, using_emulator
from .routers import ai as ai_router
from .routers import auth, calendar, media, posts, profile
from .services.ai import AIError
from .services.calendar import CalendarError, NotConnected
from .services.email import EmailError

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("linkp")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.is_production and settings.secret_key.startswith("dev-"):
        raise RuntimeError("SECRET_KEY doit être une valeur aléatoire propre en production.")
    init_firebase()
    log.info(
        "Firebase prêt (projet %s, %s)",
        settings.firebase_project_id,
        "émulateur" if using_emulator() else "production",
    )
    yield


app = FastAPI(title="LinkP API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, profile.router, ai_router.router, posts.router, calendar.router, media.router):
    app.include_router(r, prefix="/api")


@app.exception_handler(AIError)
async def _ai_error(_: Request, exc: AIError):
    return JSONResponse({"detail": str(exc)}, status_code=502)


@app.exception_handler(NotConnected)
async def _not_connected(_: Request, exc: NotConnected):
    return JSONResponse({"detail": str(exc)}, status_code=409)


@app.exception_handler(CalendarError)
async def _calendar_error(_: Request, exc: CalendarError):
    return JSONResponse({"detail": str(exc)}, status_code=502)


@app.exception_handler(EmailError)
async def _email_error(_: Request, exc: EmailError):
    return JSONResponse({"detail": str(exc)}, status_code=502)


@app.get("/health")
def health():
    return {"ok": True, "env": settings.env, "emulator": using_emulator()}
