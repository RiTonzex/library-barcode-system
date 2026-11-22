import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND_ENV_PATH = os.path.join(BACKEND_DIR, ".env")


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    APP_NAME: str = "Library Access Control System"
    API_V1_STR: str = "/api/v1"

    # Hardware Edge Device API Key Authentication (Header: X-API-KEY)
    DEVICE_API_KEY: str = "lib_esp32_secret_key_prod_998877"

    # CORS Configuration
    CORS_ORIGINS: Union[str, List[str]] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return ["*"]

    # Google Sheets Integration (Google Apps Script Web App URL)
    GOOGLE_SHEET_WEBHOOK_URL: str = ""
    SHEET_ACCESS_LOGS_TAB: str = "Access_Logs"
    SHEET_DAILY_SUMMARY_TAB: str = "Daily_Summary"
    SHEET_HISTORY_TAB: str = "Summary_History"

    # Scheduler Timezone
    CRON_TIMEZONE: str = "Asia/Bangkok"

    model_config = SettingsConfigDict(
        env_file=(BACKEND_ENV_PATH, ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
