from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    steam_api_key: str
    steam_id: str
    # Optional: RPCS3 install roots separated by ';'. Empty means the app shows Steam only.
    rpcs3_roots: str = ""

    class Config:
        env_file = ".env"

settings = Settings()