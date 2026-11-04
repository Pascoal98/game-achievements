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
