"""One library across stores: Steam plus RPCS3, in the shapes the /games endpoints already return.

RPCS3 problems are logged and dropped so they never break the Steam data; Steam errors
still propagate so the routes keep answering 502 as before.
"""
import logging

from app.services import steam
from app.services.rpcs3 import library as rpcs3_library

logger = logging.getLogger(__name__)


def _rpcs3_games() -> list:
    try:
        return list(rpcs3_library.get_library().values())
    except Exception:
        logger.warning("RPCS3 library unavailable; showing Steam only", exc_info=True)
        return []


def get_all_games() -> list[dict]:
    games = steam.get_owned_games() + [rpcs3_library.to_game_dict(g) for g in _rpcs3_games()]
    return sorted(games, key=lambda g: g.get("playtime_forever", 0), reverse=True)


def get_achievements(app_id: str) -> dict:
    if app_id.startswith(rpcs3_library.RPCS3_ID_PREFIX):
        serial = app_id[len(rpcs3_library.RPCS3_ID_PREFIX):]
        game = next((g for g in _rpcs3_games() if g.serial == serial), None)
        if game is None:
            raise KeyError(app_id)
        return rpcs3_library.achievements_for(game)
    if app_id.isdigit():
        return steam.get_game_achievements(int(app_id))
    raise KeyError(app_id)


def get_summary() -> list[dict]:
    return steam.get_all_achievements_summary() + [rpcs3_library.summary_for(g) for g in _rpcs3_games()]
