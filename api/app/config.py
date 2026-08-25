from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root: api/app/config.py -> api/app -> api -> root
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT_DIR / ".env"


def normalize_database_url(url: str) -> str:
    """Convert standard Postgres URLs to async SQLAlchemy + asyncpg format."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urlparse(url)
    query = parse_qs(parsed.query, keep_blank_values=True)
    query.pop("channel_binding", None)
    query.pop("sslmode", None)  # asyncpg uses connect_args ssl= instead
    clean_query = urlencode({k: v[0] for k, v in query.items()})
    return urlunparse(parsed._replace(query=clean_query))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://saga:sagapass@localhost:5432/saga_db"
    redis_url: str = "redis://localhost:6379/0"

    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_enabled: bool = False
    stripe_test_card_token: str = "tok_visa"

    duplicate_guard_enabled: bool = True

    chaos_enabled: bool = False
    chaos_fail_step: str = ""

    anthropic_api_key: str = ""
    openai_api_key: str = ""

    kafka_bootstrap_servers: str = "localhost:9092"

    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        return normalize_database_url(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()
