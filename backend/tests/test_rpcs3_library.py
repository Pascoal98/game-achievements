from app.services.rpcs3.library import scan
from tests.rpcs3_fixtures import make_game_dir, make_install, make_tropconf, make_tropusr, make_trp

SET = "NPWR03581_00"
CONF = make_tropconf("Sly Cooper: Thieves in Time", [(i, f"T{i}", f"D{i}", False) for i in range(5)])


def _settings(playtime: int, last: str) -> str:
    return f"[Playtime]\nBCES01284={playtime}\n\n[LastPlayed]\nBCES01284={last}\n"


def _two_installs(tmp_path, unlocks_a, unlocks_b):
    game = make_game_dir(tmp_path / "games" / "tit", "Sly Cooper: Thieves in Time", {SET: None})
    a = make_install(tmp_path / "PS3", {"BCES01284": game}, _settings(36545030, "2026-11-02T17:22:01"),
                     {SET: {"TROPCONF.SFM": CONF, "TROPUSR.DAT": make_tropusr(unlocks_a, total=5)}})
    b = make_install(tmp_path / "PS3_AXIS", {"BCES01284": game}, _settings(10824479, "2026-11-04T12:42:41"),
                     {SET: {"TROPCONF.SFM": CONF, "TROPUSR.DAT": make_tropusr(unlocks_b, total=5)}})
    return a, b


def test_same_game_in_two_installs_is_one_game_with_summed_playtime(tmp_path):
    a, b = _two_installs(tmp_path, {}, {})
    library = scan([a, b])
    assert list(library) == ["BCES01284"]
    game = library["BCES01284"]
    assert game.playtime_ms == 47369509
    later = scan([b])["BCES01284"].last_played
    assert game.last_played == later


def test_trophy_unlocked_in_both_installs_counts_once_with_earliest_date(tmp_path):
    a, b = _two_installs(tmp_path, {1: 100, 2: 200}, {1: 150, 2: 200, 3: 300})
    assert scan([a, b])["BCES01284"].unlocks == {(SET, 1): 100, (SET, 2): 200, (SET, 3): 300}


def test_collection_combines_all_sets_including_unstarted(tmp_path):
    unstarted = make_trp({"TROP.SFM": make_tropconf("Sly 3", [(0, "a", "", False), (1, "b", "", False), (2, "c", "", False)]).encode()})
    game = make_game_dir(tmp_path / "games" / "tri", "The Sly Trilogy", {"NPWR01435_00": None, "NPWR01490_00": unstarted})
    root = make_install(tmp_path / "PS3", {"BCES00968": game}, "",
                        {"NPWR01435_00": {"TROPCONF.SFM": make_tropconf("Sly 1", [(0, "x", "", False), (1, "y", "", False)])}})
    trilogy = scan([root])["BCES00968"]
    assert list(trilogy.sets) == ["NPWR01435_00", "NPWR01490_00"]
    assert sum(len(s.trophies) for s in trilogy.sets.values()) == 5
    assert "NPWR01490_00" in trilogy.trp_paths


def test_name_comes_from_param_sfo(tmp_path):
    game = make_game_dir(tmp_path / "games" / "tri", "The Sly Trilogy", {"NPWR01435_00": None})
    root = make_install(tmp_path / "PS3", {"BCES00968": game}, "",
                        {"NPWR01435_00": {"TROPCONF.SFM": make_tropconf("Sly 1", [(0, "x", "", False)])}})
    assert scan([root])["BCES00968"].name == "The Sly Trilogy"


def test_missing_root_is_skipped(tmp_path):
    a, _ = _two_installs(tmp_path, {}, {})
    assert list(scan([tmp_path / "nope", a])) == ["BCES01284"]
    assert scan([tmp_path / "nope"]) == {}


def test_corrupt_tropusr_ignores_only_that_install(tmp_path):
    a, b = _two_installs(tmp_path, {1: 100}, {3: 300})
    tropusr = a / "dev_hdd0" / "home" / "00000001" / "trophy" / SET / "TROPUSR.DAT"
    tropusr.write_bytes(tropusr.read_bytes()[:100])
    assert scan([a, b])["BCES01284"].unlocks == {(SET, 3): 300}


def test_game_without_tropdir_has_no_sets(tmp_path):
    game = tmp_path / "games" / "plain"
    (game / "PS3_GAME").mkdir(parents=True)
    root = make_install(tmp_path / "PS3", {"BCES01284": game}, _settings(60000, "2026-11-01T10:00:00"))
    result = scan([root])["BCES01284"]
    assert result.sets == {}
    assert result.playtime_ms == 60000


def test_first_existing_game_dir_wins(tmp_path):
    game = make_game_dir(tmp_path / "games" / "tit", "Sly Cooper: Thieves in Time", {SET: None})
    a = make_install(tmp_path / "A", {"BCES01284": tmp_path / "missing"})
    b = make_install(tmp_path / "B", {"BCES01284": game}, "", {SET: {"TROPCONF.SFM": CONF}})
    assert scan([a, b])["BCES01284"].game_dir == game


def test_game_with_no_existing_folder_still_appears_without_sets(tmp_path):
    root = make_install(tmp_path / "A", {"BCES01284": tmp_path / "missing"}, _settings(60000, "2026-11-01T10:00:00"))
    result = scan([root])["BCES01284"]
    assert result.game_dir is None and result.sets == {} and result.playtime_ms == 60000
