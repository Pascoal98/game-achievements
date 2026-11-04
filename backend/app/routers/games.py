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

@router.get("/achievements-summary")
def get_achievements_summary():
    try:
        return steam.get_all_achievements_summary()
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")

@router.get("/now-playing")
def get_now_playing():
    try:
        return steam.get_now_playing()
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")
