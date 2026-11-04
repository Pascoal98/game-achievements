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


def test_summary_includes_sorted_unlock_times_and_top5_recent(fake_steam):
    unlocked = [{"apiname": f"U{t}", "achieved": 1, "unlocktime": t} for t in range(1, 8)]
    fake_steam["GetPlayerAchievements"] = _player(unlocked + [{"apiname": "L", "achieved": 0, "unlocktime": 0}])
    item = steam.get_all_achievements_summary()[0]
    assert item["unlock_times"] == [7, 6, 5, 4, 3, 2, 1]
    assert [u["unlocktime"] for u in item["recent_unlocks"]] == [7, 6, 5, 4, 3]
    assert set(item["recent_unlocks"][0]) == {"apiname", "display_name", "icon", "unlocktime"}


def test_summary_game_without_achievements_has_empty_lists(fake_steam):
    fake_steam["GetPlayerAchievements"] = (400, {})
    item = steam.get_all_achievements_summary()[0]
    assert item["unlock_times"] == [] and item["recent_unlocks"] == []
