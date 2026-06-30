from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SECRET_KEY: str = "dev-secret-key-DO-NOT-USE-IN-PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "sqlite:///./digital_pass.db"
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10
    FILE_RETENTION_DAYS: int = 1
    ALLOWED_MIME_TYPES: str = "application/pdf,image/jpeg,image/png"

    ENVIRONMENT: str = "development"

    @property
    def allowed_mime_list(self) -> List[str]:
        return [m.strip() for m in self.ALLOWED_MIME_TYPES.split(",")]

    @property
    def max_file_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


settings = Settings()
