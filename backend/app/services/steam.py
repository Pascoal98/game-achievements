import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
import requests
from app import store
from app.config import settings

logger = logging.getLogger(__name__)

_achievements_cache: dict[int, tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 600
# Matches the overview tile, so a single game can fill the library-wide "8 most recent" list.
_RECENT_UNLOCKS_PER_GAME = 8
# Steam calls are I/O-bound; a small pool cuts a cold summary from ~38s without bursting hard enough to get rate limited.
_SUMMARY_WORKERS = 8
# Kept in the store; {} records "no assets" so it isn't asked for again. A month lets new key art arrive eventually.
_ART_MAX_AGE = 30 * 86_400
_ART_BATCH = 200
# Achievement names and icons rarely change once a game ships.
_SCHEMA_MAX_AGE = 7 * 86_400
_STORE_ASSETS = "https://shared.akamai.steamstatic.com/store_item_assets/"
# GetSchemaForGame still hands out this host, which 404s for newer games; community_assets serves old and new.
_OLD_ICON_HOST = "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/"
_ICON_HOST = "https://shared.akamai.steamstatic.com/community_assets/images/apps/"

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
    art = get_store_art([game["appid"] for game in games])
    for game in games:
        game["source"] = "steam"
        if art.get(game["appid"]):
            game["art"] = art[game["appid"]]
    return sorted(games, key=lambda x: x.get("playtime_forever", 0), reverse=True)

def _art_from_assets(assets) -> dict:
    """Absolute cover, hero and header URLs from a store item's assets; kinds the game lacks are left out."""
    if not isinstance(assets, dict):
        return {}
    url_format = assets.get("asset_url_format")
    if not isinstance(url_format, str) or "${FILENAME}" not in url_format:
        return {}

    def url(*keys: str) -> str | None:
        for key in keys:
            name = assets.get(key)
            if isinstance(name, str) and name:
                return _STORE_ASSETS + url_format.replace("${FILENAME}", name)
        return None

    art = {"cover": url("library_capsule_2x", "library_capsule"), "hero": url("library_hero"), "header": url("header")}
    return {kind: link for kind, link in art.items() if link}

def get_store_art(app_ids: list[int]) -> dict[int, dict]:
    """Store art by appid. Newer games keep art under hashed paths, so it can't be guessed from the appid.

    A failed store call is logged and skipped: the library still loads and the frontend falls back to guessed URLs.
    """
    known = {int(k): v for k, v in store.get_many("art", [str(a) for a in app_ids], _ART_MAX_AGE).items()}
    missing = [a for a in app_ids if a not in known]
    url = "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/"
    for start in range(0, len(missing), _ART_BATCH):
        batch = missing[start:start + _ART_BATCH]
        request = {
            "ids": [{"appid": a} for a in batch],
            "context": {"language": "english", "country_code": "US"},
            "data_request": {"include_assets": True},
        }
        try:
            r = requests.get(url, params={"input_json": json.dumps(request)}, timeout=10)
            r.raise_for_status()
            items = r.json().get("response", {}).get("store_items", [])
        except Exception:
            logger.warning("Store art lookup failed for %d games", len(batch), exc_info=True)
            continue
        fetched = {a: {} for a in batch}
        for item in items:
            if isinstance(item, dict) and item.get("appid") in fetched:
                fetched[item["appid"]] = _art_from_assets(item.get("assets"))
        store.put_many("art", {str(a): art for a, art in fetched.items()})
        known.update(fetched)
    return {a: known[a] for a in app_ids if known.get(a)}

def _icon_url(url: str) -> str:
    return _ICON_HOST + url[len(_OLD_ICON_HOST):] if url.startswith(_OLD_ICON_HOST) else url

def get_now_playing() -> dict:
    """Returns the game the user is in right now; Steam only sends gameid while in-game."""
    url = "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
    params = {"key": settings.steam_api_key, "steamids": settings.steam_id}
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    players = r.json().get("response", {}).get("players", [])
    if not players:
        raise ValueError("player not found")
    gameid = players[0].get("gameid")
    appid = int(gameid) if isinstance(gameid, str) and gameid.isdigit() else None
    return {"appid": appid, "name": players[0].get("gameextrainfo")}

def get_game_schema(app_id: int) -> dict:
    """Achievement names, descriptions and icons for a game; a failed fetch returns {} and isn't stored."""
    stored = store.get_many("schema", [str(app_id)], _SCHEMA_MAX_AGE)
    if stored:
        return stored[str(app_id)]
    url = "http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/"
    params = {"appid": app_id, "key": settings.steam_api_key}
    r = requests.get(url, params=params, timeout=10)
    if r.status_code != 200:
        return {}
    achievements = r.json().get("game", {}).get("availableGameStats", {}).get("achievements", [])
    # Keyed by apiname for easy lookup
    schema = {
        a["name"]: {
            "display_name": a.get("displayName", ""),
            "description": a.get("description", ""),
            "icon": _icon_url(a.get("icon", "")),
            "icongray": _icon_url(a.get("icongray", "")),
        }
        for a in achievements
    }
    store.put_many("schema", {str(app_id): schema})
    return schema

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

def _summarize_game(app_id: int) -> dict | None:
    """One game's summary row, or None if Steam failed for it, so one bad game doesn't sink the summary."""
    try:
        data = get_game_achievements(app_id)
    except Exception:
        logger.warning("Failed to fetch achievements for app_id=%s", app_id, exc_info=True)
        return None
    unlocked = sorted(
        (a for a in data["achievements"] if a["achieved"] == 1),
        key=lambda a: a["unlocktime"],
        reverse=True,
    )
    return {
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
    }

def get_all_achievements_summary() -> list[dict]:
    games = get_owned_games()
    with ThreadPoolExecutor(max_workers=_SUMMARY_WORKERS) as pool:
        rows = pool.map(_summarize_game, [game["appid"] for game in games])
        return [row for row in rows if row is not None]
