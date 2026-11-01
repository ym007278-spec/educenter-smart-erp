"""
EduCenter Smart ERP - System Configuration
Pydantic v2 Settings with strict environment isolation & secrets protection
"""
from typing import List
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Project Info
    PROJECT_NAME: str = "EduCenter Smart ERP - Backend Engine"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="production")
    DEBUG: bool = False

    # Security & JWT Auth
    SECRET_KEY: SecretStr = Field(
        default=SecretStr("educenter_super_secure_enterprise_random_jwt_secret_key_2026_hardened"),
        description="Cryptographic secret key for signing JWT tokens and HMAC QR codes"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 Hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # PostgreSQL Database Connection (SQLAlchemy Asyncpg)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres_secure_pwd_2026@localhost:5432/educenter_db",
        description="Async PostgreSQL Connection string using asyncpg driver"
    )
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # Rate Limiting & Anti-Brute Force
    RATE_LIMIT_LOGIN_MAX: int = 5  # Max 5 attempts per minute
    RATE_LIMIT_TREASURY_MAX: int = 30  # Max 30 requests per minute
    REDIS_URL: str = "redis://localhost:6379/0"

    # WhatsApp Cloud API Automation
    WHATSAPP_API_TOKEN: SecretStr = Field(default=SecretStr("mock_whatsapp_cloud_api_token"))
    WHATSAPP_PHONE_NUMBER_ID: str = "109876543210987"
    WHATSAPP_API_VERSION: str = "v21.0"

    # CORS Allowed Origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://center.local",
        "https://educenter.app"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="forbid",
        case_sensitive=True
    )


settings = Settings()
