from pathlib import Path

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    steam_api_key: str
    steam_id: str
    # Optional: RPCS3 install roots separated by ';'. Empty means the app shows Steam only.
    rpcs3_roots: str = ""
    # SQLite file for cached Steam data and daily playtime; gitignored.
    db_path: str = str(Path(__file__).resolve().parent.parent / "data" / "cache.db")

    class Config:
        env_file = ".env"

settings = Settings()