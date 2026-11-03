from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field


class ProfileIn(BaseModel):
    full_name: str = ""
    job_title: str = ""
    industry: str = ""
    bio: str = ""
    language: str = "fr"
    tones: list[str] = []
    themes: list[str] = []
    start_date: date | None = None
    end_date: date | None = None
    posts_per_week: int = Field(3, ge=1, le=14)
    publish_time: time | None = None


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)


class ExampleIn(BaseModel):
    content: str = Field(min_length=20, max_length=5000)


class ExampleOut(ExampleIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    theme: str
    content: str
    scheduled_for: datetime | None
    status: str
