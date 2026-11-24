from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./reading.db"
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 14
    openai_api_key: str = ""
    openai_base_url: str = "https://api.tokenfactory.nebius.com/v1/"
    openai_model: str = "openai/gpt-oss-120b"
    storage_dir: str = "./storage"
    cors_origins: str = (
        "http://localhost:8081,http://127.0.0.1:8081,http://localhost:5173"
    )
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_bucket: str = "documents"
    max_upload_bytes: int = 15 * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
