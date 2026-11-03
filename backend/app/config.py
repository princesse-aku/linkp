from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    next_public_supabase_url: str
    supabase_jwt_secret: str = ""
    frontend_origin: str = "http://localhost:3000"
    rodium_api_url: str = "https://api.rodiumai.io/v1"
    rodium_api_key: str = ""
    rodium_model: str = "anthropic/claude-sonnet-4-6"


settings = Settings()
