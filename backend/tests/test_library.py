import pytest

from app.services import library, steam
from app.services.rpcs3 import library as rpcs3_library
from tests.rpcs3_fixtures import make_game_dir, make_install, make_tropconf, make_tropusr, make_trp

SET = "NPWR03581_00"
UNSTARTED = "NPWR09999_00"
STEAM_GAME = {"appid": 730, "name": "CS", "playtime_forever": 600, "source": "steam"}


@pytest.fixture
def rpcs3(tmp_path, monkeypatch):
    conf = make_tropconf("Sly Cooper: Thieves in Time", [(0, "Open", "First", False), (1, "Vault", "Second", False), (2, "Secret", "Spoiler", True)])
    unstarted_trp = make_trp({"TROP.SFM": make_tropconf("Extra", [(0, "Later", "", False)]).encode(), "TROP000.PNG": b"trp-icon"})
    game = make_game_dir(tmp_path / "games" / "tit", "Sly Cooper: Thieves in Time", {SET: None, UNSTARTED: unstarted_trp})
    root = make_install(
        tmp_path / "PS3",
        {"BCES01284": game},
        "[Playtime]\nBCES01284=47369509\n\n[LastPlayed]\nBCES01284=2026-11-04T12:42:41\n",
        {SET: {"TROPCONF.SFM": conf, "TROPUSR.DAT": make_tropusr({1: 1793796000}, total=3), "TROP001.PNG": b"icon-1"}},
    )
    scanned = rpcs3_library.scan([root])
    monkeypatch.setattr(rpcs3_library, "get_library", lambda: scanned)
    return scanned


@pytest.fixture
def steam_ok(monkeypatch):
    monkeypatch.setattr(steam, "get_owned_games", lambda: [dict(STEAM_GAME)])
    monkeypatch.setattr(steam, "get_all_achievements_summary", lambda: [{"appid": 730, "unlocked": 1, "total": 2}])
    monkeypatch.setattr(steam, "get_game_achievements", lambda app_id: {"steam": app_id})


def test_all_games_merges_and_sorts_by_playtime(rpcs3, steam_ok):
    games = library.get_all_games()
    assert [g["appid"] for g in games] == ["rpcs3-BCES01284", 730]
    sly = games[0]
    assert sly["source"] == "rpcs3"
    assert sly["playtime_forever"] == 789
    assert sly["name"] == "Sly Cooper: Thieves in Time"
    assert sly["banner_url"] == "/rpcs3/images/BCES01284/icon0"
    assert sly["backdrop_url"] == "/rpcs3/images/BCES01284/pic1"


def test_rpcs3_achievements_use_steam_shape_and_mask_hidden_locked(rpcs3, steam_ok):
    data = library.get_achievements("rpcs3-BCES01284")
    assert data["has_achievements"] is True
    assert (data["unlocked"], data["total"]) == (1, 4)
    by_name = {a["apiname"]: a for a in data["achievements"]}
    assert by_name[f"{SET}:1"]["achieved"] == 1
    assert by_name[f"{SET}:1"]["unlocktime"] == 1793796000
    assert by_name[f"{SET}:1"]["icon"] == f"/rpcs3/images/BCES01284/trophies/{SET}/1"
    hidden = by_name[f"{SET}:2"]
    assert (hidden["display_name"], hidden["description"], hidden["achieved"]) == ("Hidden trophy", "", 0)


def test_rpcs3_summary_item_matches_steam_shape(rpcs3, steam_ok):
    items = {item["appid"]: item for item in library.get_summary()}
    sly = items["rpcs3-BCES01284"]
    assert (sly["unlocked"], sly["total"], sly["has_achievements"]) == (1, 4, True)
    assert sly["unlock_times"] == [1793796000]
    assert sly["recent_unlocks"][0]["apiname"] == f"{SET}:1"
    assert 730 in items


def test_get_achievements_routes_by_id(rpcs3, steam_ok):
    assert library.get_achievements("730") == {"steam": 730}
    with pytest.raises(KeyError):
        library.get_achievements("rpcs3-NOPE")
    with pytest.raises(KeyError):
        library.get_achievements("abc")


def test_rpcs3_failure_returns_steam_only(steam_ok, monkeypatch):
    def broken():
        raise OSError("E: drive unplugged")
    monkeypatch.setattr(rpcs3_library, "get_library", broken)
    assert [g["appid"] for g in library.get_all_games()] == [730]
    assert [i["appid"] for i in library.get_summary()] == [730]


def test_get_image_never_leaves_the_scan(rpcs3):
    assert rpcs3_library.get_image("../../etc/passwd", "icon0") is None
    assert rpcs3_library.get_image("BCES01284", "../x") is None
    assert rpcs3_library.get_image("BCES01284", "trophy", "NPWR_NOPE", 1) is None
    assert rpcs3_library.get_image("BCES01284", "trophy", SET, 99) is None
    assert rpcs3_library.get_image("BCES01284", "icon0") == b"icon0-png"
    assert rpcs3_library.get_image("BCES01284", "trophy", SET, 1) == b"icon-1"
    assert rpcs3_library.get_image("BCES01284", "trophy", UNSTARTED, 0) == b"trp-icon"
