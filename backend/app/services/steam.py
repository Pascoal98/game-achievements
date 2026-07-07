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

def get_game_achievements(app_id: int) -> dict:
    url = "http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/"
    params = {"appid": app_id, "key": settings.steam_api_key, "steamid": settings.steam_id}
    r = requests.get(url, params=params)
    if r.status_code == 400:
        return {"has_achievements": False, "achievements": [], "unlocked": 0, "total": 0}
    r.raise_for_status()
    achievements = r.json().get("playerstats", {}).get("achievements", [])
    return {
        "has_achievements": True,
        "achievements": achievements,
        "unlocked": sum(1 for a in achievements if a.get("achieved") == 1),
        "total": len(achievements),
    }