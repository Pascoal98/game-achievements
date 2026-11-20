import pytest

from app.services import steam


def _player(achievements):
    return (200, {"playerstats": {"achievements": achievements}})


def _schema(achievements):
    return (200, {"game": {"availableGameStats": {"achievements": achievements}}})


def test_achievements_include_unlocktime_and_icons(fake_steam):
    fake_steam["GetPlayerAchievements"] = _player([
        {"apiname": "A", "achieved": 1, "unlocktime": 1700000000},
        {"apiname": "B", "achieved": 0, "unlocktime": 0},
    ])
    fake_steam["GetSchemaForGame"] = _schema([
        {"name": "A", "displayName": "Alpha", "description": "", "icon": "https://x/a.jpg", "icongray": "https://x/a_gray.jpg"},
        {"name": "B", "displayName": "Beta", "description": "", "icon": "https://x/b.jpg", "icongray": "https://x/b_gray.jpg"},
    ])
    a, b = steam.get_game_achievements(10)["achievements"]
    assert a["unlocktime"] == 1700000000 and a["icon"] == "https://x/a.jpg"
    assert b["unlocktime"] == 0 and b["icongray"] == "https://x/b_gray.jpg"


def test_achievements_icon_defaults_to_empty_when_schema_missing(fake_steam):
    fake_steam["GetPlayerAchievements"] = _player([{"apiname": "A", "achieved": 1, "unlocktime": 5}])
    fake_steam["GetSchemaForGame"] = (500, {})
    a = steam.get_game_achievements(10)["achievements"][0]
    assert a["icon"] == "" and a["icongray"] == ""


def test_summary_includes_sorted_unlock_times_and_top8_recent(fake_steam):
    # The overview shows the 8 most recent unlocks library-wide, so one game must be able to supply all 8.
    unlocked = [{"apiname": f"U{t}", "achieved": 1, "unlocktime": t} for t in range(1, 11)]
    fake_steam["GetPlayerAchievements"] = _player(unlocked + [{"apiname": "L", "achieved": 0, "unlocktime": 0}])
    item = steam.get_all_achievements_summary()[0]
    assert item["unlock_times"] == [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    assert [u["unlocktime"] for u in item["recent_unlocks"]] == [10, 9, 8, 7, 6, 5, 4, 3]
    assert set(item["recent_unlocks"][0]) == {"apiname", "display_name", "icon", "unlocktime"}


def test_summary_game_without_achievements_has_empty_lists(fake_steam):
    fake_steam["GetPlayerAchievements"] = (400, {})
    item = steam.get_all_achievements_summary()[0]
    assert item["unlock_times"] == [] and item["recent_unlocks"] == []


def test_now_playing_returns_game_when_in_game(fake_steam):
    fake_steam["GetPlayerSummaries"] = (200, {"response": {"players": [{"gameid": "570", "gameextrainfo": "Dota 2"}]}})
    assert steam.get_now_playing() == {"appid": 570, "name": "Dota 2"}


def test_now_playing_returns_nulls_when_not_in_game(fake_steam):
    fake_steam["GetPlayerSummaries"] = (200, {"response": {"players": [{"steamid": "1"}]}})
    assert steam.get_now_playing() == {"appid": None, "name": None}


def test_now_playing_raises_when_player_missing(fake_steam):
    fake_steam["GetPlayerSummaries"] = (200, {"response": {"players": []}})
    with pytest.raises(ValueError):
        steam.get_now_playing()


def _owned(n):
    games = [{"appid": i, "name": f"G{i}", "playtime_forever": 100 - i} for i in range(1, n + 1)]
    return (200, {"response": {"games": games}})


def test_summary_fetches_games_concurrently(fake_steam, monkeypatch):
    # A cold summary was ~38s for 164 games because each game's Steam calls ran one after another.
    import threading
    import time

    fake_steam["GetOwnedGames"] = _owned(8)
    original_get = steam.requests.get
    lock = threading.Lock()
    in_flight = 0
    peak = 0

    def slow_get(url, params=None, timeout=None):
        nonlocal in_flight, peak
        if "GetPlayerAchievements" not in url:
            return original_get(url, params=params, timeout=timeout)
        with lock:
            in_flight += 1
            peak = max(peak, in_flight)
        time.sleep(0.05)
        with lock:
            in_flight -= 1
        return original_get(url, params=params, timeout=timeout)

    monkeypatch.setattr(steam.requests, "get", slow_get)
    assert len(steam.get_all_achievements_summary()) == 8
    assert peak > 1


def test_summary_keeps_owned_games_order(fake_steam):
    fake_steam["GetOwnedGames"] = _owned(12)
    assert [item["appid"] for item in steam.get_all_achievements_summary()] == list(range(1, 13))


def test_summary_skips_a_game_whose_fetch_fails(fake_steam, monkeypatch):
    fake_steam["GetOwnedGames"] = _owned(3)
    original_get = steam.requests.get

    def failing_for_game_2(url, params=None, timeout=None):
        if "GetPlayerAchievements" in url and params["appid"] == 2:
            raise RuntimeError("Steam timeout")
        return original_get(url, params=params, timeout=timeout)

    monkeypatch.setattr(steam.requests, "get", failing_for_game_2)
    assert [item["appid"] for item in steam.get_all_achievements_summary()] == [1, 3]


def test_owned_games_are_tagged_as_steam(fake_steam):
    assert steam.get_owned_games()[0]["source"] == "steam"


def _store_items(*items):
    return (200, {"response": {"store_items": list(items)}})


ASSET_BASE = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/10/"


def test_owned_games_carry_store_art_from_hashed_paths(fake_steam):
    # Newer games keep art under hashed folders, so the plain CDN path guess 404s for them.
    fake_steam["GetItems"] = _store_items({"appid": 10, "assets": {
        "asset_url_format": "steam/apps/10/${FILENAME}?t=7",
        "library_capsule": "aa/library_capsule.jpg",
        "library_capsule_2x": "aa/library_capsule_2x.jpg",
        "library_hero": "bb/library_hero.jpg",
        "header": "cc/header.jpg",
    }})
    assert steam.get_owned_games()[0]["art"] == {
        "cover": f"{ASSET_BASE}aa/library_capsule_2x.jpg?t=7",
        "hero": f"{ASSET_BASE}bb/library_hero.jpg?t=7",
        "header": f"{ASSET_BASE}cc/header.jpg?t=7",
    }


def test_store_art_falls_back_to_the_small_cover_and_skips_missing_kinds(fake_steam):
    fake_steam["GetItems"] = _store_items({"appid": 10, "assets": {
        "asset_url_format": "steam/apps/10/${FILENAME}",
        "library_capsule": "library_600x900.jpg",
    }})
    assert steam.get_owned_games()[0]["art"] == {"cover": f"{ASSET_BASE}library_600x900.jpg"}


def test_games_without_store_assets_have_no_art(fake_steam):
    fake_steam["GetItems"] = _store_items({"appid": 10, "success": 15})
    assert "art" not in steam.get_owned_games()[0]


def test_store_outage_still_returns_the_library(fake_steam):
    fake_steam["GetItems"] = (500, {})
    games = steam.get_owned_games()
    assert [g["appid"] for g in games] == [10]
    assert "art" not in games[0]


def test_achievement_icons_move_off_the_retired_cdn_host(fake_steam):
    # steamcdn-a.akamaihd.net 404s for newer games; the community_assets host serves old and new.
    fake_steam["GetPlayerAchievements"] = _player([{"apiname": "A", "achieved": 1, "unlocktime": 5}])
    old = "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/10/"
    fake_steam["GetSchemaForGame"] = _schema([{"name": "A", "displayName": "Alpha", "icon": f"{old}abc.jpg", "icongray": f"{old}def.jpg"}])
    a = steam.get_game_achievements(10)["achievements"][0]
    assert a["icon"] == "https://shared.akamai.steamstatic.com/community_assets/images/apps/10/abc.jpg"
    assert a["icongray"] == "https://shared.akamai.steamstatic.com/community_assets/images/apps/10/def.jpg"


def test_store_art_survives_a_restart(fake_steam):
    fake_steam["GetItems"] = _store_items({"appid": 10, "assets": {"asset_url_format": "steam/apps/10/${FILENAME}", "header": "h.jpg"}})
    steam.get_owned_games()
    # A fresh process has no in-memory state; the store is all that's left, and the store API is down.
    fake_steam["GetItems"] = (500, {})
    assert steam.get_owned_games()[0]["art"] == {"header": f"{ASSET_BASE}h.jpg"}


def test_achievement_schema_is_reused_after_the_short_cache_expires(fake_steam):
    fake_steam["GetPlayerAchievements"] = _player([{"apiname": "A", "achieved": 1, "unlocktime": 5}])
    fake_steam["GetSchemaForGame"] = _schema([{"name": "A", "displayName": "Alpha"}])
    steam.get_game_achievements(10)
    steam._achievements_cache.clear()
    fake_steam["GetSchemaForGame"] = (500, {})
    assert steam.get_game_achievements(10)["achievements"][0]["display_name"] == "Alpha"


def test_a_failed_schema_fetch_is_not_kept(fake_steam):
    fake_steam["GetPlayerAchievements"] = _player([{"apiname": "A", "achieved": 1, "unlocktime": 5}])
    fake_steam["GetSchemaForGame"] = (500, {})
    assert steam.get_game_achievements(10)["achievements"][0]["display_name"] == "A"
    steam._achievements_cache.clear()
    fake_steam["GetSchemaForGame"] = _schema([{"name": "A", "displayName": "Alpha"}])
    assert steam.get_game_achievements(10)["achievements"][0]["display_name"] == "Alpha"


def _rarity(*pairs):
    # Steam sends percentages as strings.
    return (200, {"achievementpercentages": {"achievements": [{"name": n, "percent": p} for n, p in pairs]}})


def test_achievements_carry_the_share_of_players_who_have_them(fake_steam):
    fake_steam["GetPlayerAchievements"] = _player([
        {"apiname": "A", "achieved": 1, "unlocktime": 5},
        {"apiname": "B", "achieved": 0, "unlocktime": 0},
    ])
    fake_steam["GetGlobalAchievementPercentagesForApp"] = _rarity(("A", "74.9"), ("B", "nonsense"))
    a, b = steam.get_game_achievements(10)["achievements"]
    assert a["rarity"] == 74.9
    assert b["rarity"] is None


def test_a_rarity_outage_leaves_achievements_intact_and_is_not_kept(fake_steam):
    fake_steam["GetPlayerAchievements"] = _player([{"apiname": "A", "achieved": 1, "unlocktime": 5}])
    fake_steam["GetGlobalAchievementPercentagesForApp"] = (500, {})
    data = steam.get_game_achievements(10)
    assert data["unlocked"] == 1 and data["achievements"][0]["rarity"] is None
    steam._achievements_cache.clear()
    fake_steam["GetGlobalAchievementPercentagesForApp"] = _rarity(("A", "3.2"))
    assert steam.get_game_achievements(10)["achievements"][0]["rarity"] == 3.2


def test_summary_lists_your_rarest_unlocks_rarest_first(fake_steam):
    fake_steam["GetPlayerAchievements"] = _player(
        [{"apiname": f"U{i}", "achieved": 1, "unlocktime": i} for i in range(7)]
        + [{"apiname": "LOCKED", "achieved": 0, "unlocktime": 0}, {"apiname": "UNRATED", "achieved": 1, "unlocktime": 9}]
    )
    fake_steam["GetGlobalAchievementPercentagesForApp"] = _rarity(("LOCKED", "0.1"), *[(f"U{i}", str(50 - i)) for i in range(7)])
    rarest = steam.get_all_achievements_summary()[0]["rarest"]
    assert [r["apiname"] for r in rarest] == ["U6", "U5", "U4", "U3", "U2"]
    assert rarest[0] == {"apiname": "U6", "display_name": "U6", "icon": "", "unlocktime": 6, "rarity": 44.0}
