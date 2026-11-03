from datetime import date, time
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _clean_list(values: list[str], max_items: int, max_len: int) -> list[str]:
    seen: list[str] = []
    for v in values:
        v = v.strip()[:max_len]
        if v and v.lower() not in (s.lower() for s in seen):
            seen.append(v)
    return seen[:max_items]


class StyleAnalysis(BaseModel):
    summary: str = ""
    tone_keywords: list[str] = []
    typical_length: str = ""
    structure: str = ""
    vocabulary: list[str] = []
    avoid: list[str] = []
    examples_count: int = 0
    analyzed_at: str | None = None


class ProfileIn(BaseModel):
    full_name: str = Field("", max_length=120)
    job_title: str = Field("", max_length=120)
    industry: str = Field("", max_length=120)
    bio: str = Field("", max_length=1500)
    language: Literal["fr", "en"] = "fr"
    timezone: str = "Europe/Paris"
    tones: list[str] = []
    themes: list[str] = []
    start_date: date | None = None
    end_date: date | None = None
    posts_per_week: int = Field(3, ge=1, le=7)
    publish_time: time | None = None

    @field_validator("tones")
    @classmethod
    def _tones(cls, v: list[str]) -> list[str]:
        return _clean_list(v, 10, 40)

    @field_validator("themes")
    @classmethod
    def _themes(cls, v: list[str]) -> list[str]:
        return _clean_list(v, 30, 80)

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Fuseau horaire inconnu")
        return v


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)
    email: str | None = None
    style_analysis: StyleAnalysis | None = None


class ExampleIn(BaseModel):
    content: str = Field(min_length=20, max_length=5000)


class ExampleOut(ExampleIn):
    id: str


PostStatus = Literal["draft", "scheduled", "published"]


class PostOut(BaseModel):
    id: str
    theme: str = ""
    content: str = ""
    scheduled_for: str | None = None  # ISO local, interprété avec le fuseau du profil
    status: PostStatus = "draft"
    media_urls: list[str] = []
    calendar_event_id: str | None = None


class PostUpdate(BaseModel):
    content: str | None = Field(None, min_length=1, max_length=5000)
    theme: str | None = Field(None, max_length=120)
    scheduled_for: str | None = None
    status: PostStatus | None = None
    media_urls: list[str] | None = Field(None, max_length=10)


class PostRegenerate(BaseModel):
    instruction: str = Field("", max_length=500)


class GenerateIn(BaseModel):
    replace_drafts: bool = True


class GenerateOneIn(BaseModel):
    theme: str = Field(min_length=1, max_length=120)
    scheduled_for: str

    @field_validator("scheduled_for")
    @classmethod
    def _iso(cls, v: str) -> str:
        from datetime import datetime

        try:
            datetime.fromisoformat(v)
        except ValueError:
            raise ValueError("Date de publication invalide.")
        return v


class CalendarSyncResult(BaseModel):
    connected: bool = False
    synced: int = 0
    error: str | None = None


class GenerateOut(BaseModel):
    posts: list[PostOut]
    calendar: CalendarSyncResult


class ThemeSuggestions(BaseModel):
    themes: list[str]


class MediaOut(BaseModel):
    id: str
    url: str
    filename: str = ""
    resource_type: str = "image"
    bytes: int = 0


class PostImageIn(BaseModel):
    instruction: str = Field("", max_length=300)


class PostImageOut(BaseModel):
    post: PostOut
    media: MediaOut


class CalendarStatus(BaseModel):
    configured: bool
    connected: bool
    email: str | None = None


class PasswordResetIn(BaseModel):
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AiKeyIn(BaseModel):
    api_key: str = Field(min_length=10, max_length=300)

    @field_validator("api_key")
    @classmethod
    def _format(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("rd_sk_") or any(c.isspace() for c in v):
            raise ValueError("Une clé RodiumAI commence par « rd_sk_ ».")
        return v


class AiKeyStatus(BaseModel):
    configured: bool
    last4: str | None = None
