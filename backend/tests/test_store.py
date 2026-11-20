from app import store


def test_values_round_trip_as_json():
    store.put_many("art", {"10": {"cover": "c"}, "20": {}})
    assert store.get_many("art", ["10", "20", "30"]) == {"10": {"cover": "c"}, "20": {}}


def test_entries_older_than_max_age_read_as_missing(monkeypatch):
    monkeypatch.setattr(store.time, "time", lambda: 1000.0)
    store.put_many("schema", {"10": {"A": {}}})
    monkeypatch.setattr(store.time, "time", lambda: 1000.0 + 60)
    assert store.get_many("schema", ["10"], max_age=61) == {"10": {"A": {}}}
    assert store.get_many("schema", ["10"], max_age=59) == {}


def test_putting_again_replaces_the_value():
    store.put_many("art", {"10": {"cover": "old"}})
    store.put_many("art", {"10": {"cover": "new"}})
    assert store.get_many("art", ["10"]) == {"10": {"cover": "new"}}


def test_one_playtime_row_per_game_per_day_holding_the_latest_value():
    store.record_playtime("2026-11-20", {"10": 60, "rpcs3-X": 5})
    store.record_playtime("2026-11-20", {"10": 90})
    store.record_playtime("2026-11-21", {"10": 120})
    assert store.playtime_on("2026-11-20") == {"10": 90, "rpcs3-X": 5}
    assert store.playtime_on("2026-11-21") == {"10": 120}
