import requests
from app.config import settings

def get_owned_games() -> list:
    url = "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"
    params = {
        "key": settings.steam_api_key,
        "steamid": settings.steam_id,
        "include_appinfo": True,
        "include_played_free_games": True,
    }
    r = requests.get(url, params=params)
    r.raise_for_status()
    games = r.json().get("response", {}).get("games", [])
    return sorted(games, key=lambda x: x.get("playtime_forever", 0), reverse=True)

def get_game_schema(app_id: int) -> dict:
    """Fetches achievement names and descriptions for a game."""
    url = "http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
    params = {"appid": app_id, "key": settings.steam_api_key}
    r = requests.get(url, params=params)
    if r.status_code != 200:
        return {}
    achievements = r.json().get("game", {}).get("availableGameStats", {}).get("achievements", [])
    # Return a dict keyed by apiname for easy lookup
    return {a["name"]: {"display_name": a.get("displayName", ""), "description": a.get("description", "")} for a in achievements}

def get_game_achievements(app_id: int) -> dict:
    url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/"
    params = {"appid": app_id, "key": settings.steam_api_key, "steamid": settings.steam_id}
    r = requests.get(url, params=params)

    if r.status_code == 400:
        return {"has_achievements": False, "achievements": [], "unlocked": 0, "total": 0}
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
            "display_name": meta.get("display_name") or name,  # fallback to apiname
            "description": meta.get("description", ""),
        })

    return {
        "has_achievements": True,
        "achievements": enriched,
        "unlocked": sum(1 for a in achievements if a.get("achieved") == 1),
        "total": len(achievements),
    }