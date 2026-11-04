from datetime import datetime
from pathlib import Path

import pytest

from app.services.rpcs3.formats import (
    Trophy,
    parse_games_yml,
    parse_persistent_settings,
    parse_sfo_title,
    parse_tropconf,
    parse_tropusr,
    parse_trp,
    windows_to_local,
)
from tests.rpcs3_fixtures import make_sfo, make_tropconf, make_tropusr, make_trp


def test_windows_path_maps_to_wsl_mount():
    assert windows_to_local("E:/PS3/games//[BCES-01284]-Sly/") == Path("/mnt/e/PS3/games/[BCES-01284]-Sly")


def test_non_drive_path_is_unchanged():
    assert windows_to_local("/tmp/games/x") == Path("/tmp/games/x")


def test_games_yml():
    text = "BCES00968: E:/PS3/games//[BCES-00968]-The Sly Trilogy/\n"
    assert parse_games_yml(text) == {"BCES00968": "E:/PS3/games//[BCES-00968]-The Sly Trilogy/"}


def test_persistent_settings_reads_playtime_and_local_last_played():
    text = "[Playtime]\nBCES01284=36545030\n\n[LastPlayed]\nBCES01284=2026-11-02T17:22:01\n"
    playtime, last = parse_persistent_settings(text)
    assert playtime == {"BCES01284": 36545030}
    assert last == {"BCES01284": int(datetime(2026, 11, 2, 17, 22, 1).timestamp())}


def test_persistent_settings_without_sections_is_empty():
    assert parse_persistent_settings("") == ({}, {})


def test_tropusr_round_trip_keeps_only_unlocked():
    assert parse_tropusr(make_tropusr({1: 1764599040, 9: 1793401080}, total=50)) == {1: 1764599040, 9: 1793401080}


def test_tropusr_rejects_bad_magic_and_truncation():
    with pytest.raises(ValueError):
        parse_tropusr(b"\0" * 64)
    with pytest.raises(ValueError):
        parse_tropusr(make_tropusr({1: 1764599040}, total=50)[:100])


def test_trp_extracts_files():
    assert parse_trp(make_trp({"TROP.SFM": b"<x/>", "TROP000.PNG": b"png"}))["TROP000.PNG"] == b"png"


def test_trp_rejects_bad_magic():
    with pytest.raises(ValueError):
        parse_trp(b"\0" * 128)


def test_tropconf_reads_title_and_hidden_flag():
    s = parse_tropconf(make_tropconf("Sly 1", [(0, "Thief", "Steal", False), (1, "Secret", "Shh", True)]))
    assert s.title == "Sly 1"
    assert s.trophies[1] == Trophy(1, "Secret", "Shh", True)


def test_tropconf_without_title_has_empty_title():
    assert parse_tropconf(make_tropconf(None, [(0, "A", "B", False)])).title == ""


def test_sfo_title():
    assert parse_sfo_title(make_sfo("The Sly Trilogy")) == "The Sly Trilogy"
