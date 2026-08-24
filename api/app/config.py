from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://saga:sagapass@localhost:5432/saga_db"
    redis_url: str = "redis://localhost:6379/0"
    
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    
    chaos_enabled: bool = False
    chaos_fail_step: str = ""
    
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    
    kafka_bootstrap_servers: str = "localhost:9092"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
