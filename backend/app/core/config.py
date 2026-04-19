"""Application settings — single source of truth for config.

All environment-driven config goes here. Import `settings` anywhere.
"""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "ERP API"
    version: str = "0.1.0"
    environment: str = Field(default="development")
    debug: bool = True

    # Database
    database_url: str = "sqlite+aiosqlite:///./erp.db"

    # Auth
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expires_minutes: int = 60
    refresh_token_expires_days: int = 30

    # CORS
    cors_origins: List[str] = ["*"]

    # Storage (for documents)
    storage_backend: str = "local"  # local | s3
    storage_local_path: str = "./storage"

    # Public base URL (for tracking links in documents)
    public_base_url: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()