from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "LalaDog API"
    DATABASE_URL: str = "postgresql+asyncpg://sa:123@192.168.50.13:5432/laladog"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = "backend/.env"
        extra = "ignore"


settings = Settings()
