from fastapi import APIRouter, HTTPException
from app.services import steam

router = APIRouter(prefix="/games", tags=["games"])

@router.get("")
def get_games():
    try:
        return steam.get_owned_games()
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")

@router.get("/{app_id}/achievements")
def get_achievements(app_id: int):
    try:
        return steam.get_game_achievements(app_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")