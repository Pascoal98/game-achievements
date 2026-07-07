from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    steam_api_key: str
    steam_id: str

    class Config:
        env_file = ".env"

settings = Settings()