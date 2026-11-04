import logging
import time
import requests
from app.config import settings

logger = logging.getLogger(__name__)

_achievements_cache: dict[int, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 600
_RECENT_UNLOCKS_PER_GAME = 5

def get_owned_games() -> list:
    url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"
    params = {
        "key": settings.steam_api_key,
        "steamid": settings.steam_id,
        "include_appinfo": True,
        "include_played_free_games": True,
    }
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    games = r.json().get("response", {}).get("games", [])
    return sorted(games, key=lambda x: x.get("playtime_forever", 0), reverse=True)

def get_game_schema(app_id: int) -> dict:
    """Fetches achievement names and descriptions for a game."""
    url = "http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
    params = {"appid": app_id, "key": settings.steam_api_key}
    r = requests.get(url, params=params, timeout=10)
    if r.status_code != 200:
        return {}
    achievements = r.json().get("game", {}).get("availableGameStats", {}).get("achievements", [])
    # Return a dict keyed by apiname for easy lookup
    return {
        a["name"]: {
            "display_name": a.get("displayName", ""),
            "description": a.get("description", ""),
            "icon": a.get("icon", ""),
            "icongray": a.get("icongray", ""),
        }
        for a in achievements
    }

def get_game_achievements(app_id: int) -> dict:
    cached = _achievements_cache.get(app_id)
    if cached and time.time() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/"
    params = {"appid": app_id, "key": settings.steam_api_key, "steamid": settings.steam_id}
    r = requests.get(url, params=params, timeout=10)

    if r.status_code == 400:
        result = {"has_achievements": False, "achievements": [], "unlocked": 0, "total": 0}
        _achievements_cache[app_id] = (time.time(), result)
        return result
    r.raise_for_status()

    achievements = r.json().get("playerstats", {}).get("achievements", [])
    schema = get_game_schema(app_id)

    enriched = []
    for a in achievements:
        name = a.get("apiname", "")
        meta = schema.get(name, {})
        enriched.append({
            "apiname": name,
            "achieved": a.get("achieved", 0),
            "display_name": meta.get("display_name") or name,
            "description": meta.get("description", ""),
            "unlocktime": a.get("unlocktime", 0),
            "icon": meta.get("icon", ""),
            "icongray": meta.get("icongray", ""),
        })

    result = {
        "has_achievements": True,
        "achievements": enriched,
        "unlocked": sum(1 for a in achievements if a.get("achieved") == 1),
        "total": len(achievements),
    }
    _achievements_cache[app_id] = (time.time(), result)
    return result

def get_all_achievements_summary() -> list[dict]:
    games = get_owned_games()
    summary = []
    for game in games:
        app_id = game["appid"]
        try:
            data = get_game_achievements(app_id)
            unlocked = sorted(
                (a for a in data["achievements"] if a["achieved"] == 1),
                key=lambda a: a["unlocktime"],
                reverse=True,
            )
            summary.append({
                "appid": app_id,
                "unlocked": data["unlocked"],
                "total": data["total"],
                "has_achievements": data["has_achievements"],
                "unlock_times": [a["unlocktime"] for a in unlocked],
                "recent_unlocks": [
                    {
                        "apiname": a["apiname"],
                        "display_name": a["display_name"],
                        "icon": a["icon"],
                        "unlocktime": a["unlocktime"],
                    }
                    for a in unlocked[:_RECENT_UNLOCKS_PER_GAME]
                ],
            })
        except Exception:
            logger.warning("Failed to fetch achievements for app_id=%s", app_id, exc_info=True)
            continue
    return summary