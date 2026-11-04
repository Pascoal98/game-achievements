from fastapi import APIRouter, HTTPException
from app.services import library, steam

router = APIRouter(prefix="/games", tags=["games"])

@router.get("")
def get_games():
    try:
        return library.get_all_games()
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")

@router.get("/{app_id}/achievements")
def get_achievements(app_id: str):
    try:
        return library.get_achievements(app_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Game not found")
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")

@router.get("/achievements-summary")
def get_achievements_summary():
    try:
        return library.get_summary()
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")

@router.get("/now-playing")
def get_now_playing():
    try:
        return steam.get_now_playing()
    except Exception:
        raise HTTPException(status_code=502, detail="Steam API error")
