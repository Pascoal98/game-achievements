import os

# app.config instantiates Settings() at import time, so these must exist first.
os.environ.setdefault("STEAM_API_KEY", "test")
os.environ.setdefault("STEAM_ID", "1")

import pytest

from app.services import steam


class FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


@pytest.fixture(autouse=True)
def clear_cache():
    steam._achievements_cache.clear()
    yield
    steam._achievements_cache.clear()


@pytest.fixture
def fake_steam(monkeypatch):
    """Route requests.get by Steam endpoint name; tests set entries in `routes`."""
    routes: dict[str, tuple[int, dict]] = {
        "GetOwnedGames": (200, {"response": {"games": [{"appid": 10, "name": "Game", "playtime_forever": 1}]}}),
        "GetPlayerAchievements": (200, {"playerstats": {"achievements": []}}),
        "GetSchemaForGame": (200, {"game": {"availableGameStats": {"achievements": []}}}),
        "GetPlayerSummaries": (200, {"response": {"players": [{"steamid": "1"}]}}),
    }

    def fake_get(url, params=None, timeout=None):
        for name, (status, payload) in routes.items():
            if name in url:
                return FakeResponse(status, payload)
        raise AssertionError(f"unexpected URL {url}")

    monkeypatch.setattr(steam.requests, "get", fake_get)
    return routes
