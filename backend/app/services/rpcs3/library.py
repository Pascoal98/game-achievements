"""Scans the configured RPCS3 installs and combines them into one view per game.

Combining rules (see the RPCS3 design spec): a serial listed by several installs is one
game, playtime is summed, last played is the latest, and a trophy counts once, dated by
the earliest install that unlocked it.
"""
import logging
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, TypeVar

from app.config import settings
from app.services.rpcs3.formats import (
    TrophySet,
    parse_games_yml,
    parse_persistent_settings,
    parse_sfo_title,
    parse_tropconf,
    parse_tropusr,
    parse_trp,
    windows_to_local,
)

logger = logging.getLogger(__name__)

_USER_TROPHY_DIR = Path("dev_hdd0") / "home" / "00000001" / "trophy"
_TROPHY_ICON = re.compile(r"^TROP(\d{3})\.PNG$", re.IGNORECASE)
_CACHE_TTL_SECONDS = 60
_cache: tuple[float, tuple[str, ...], dict] | None = None

T = TypeVar("T")


@dataclass
class Rpcs3Game:
    serial: str
    name: str
    playtime_ms: int
    last_played: int
    game_dir: Path | None
    sets: dict[str, TrophySet] = field(default_factory=dict)
    unlocks: dict[tuple[str, int], int] = field(default_factory=dict)
    icon_paths: dict[tuple[str, int], Path] = field(default_factory=dict)
    trp_paths: dict[str, Path] = field(default_factory=dict)


def _read(path: Path, parse: Callable[[bytes], T]) -> T | None:
    """Parse one file, or log and return None so a single bad file doesn't sink the scan."""
    try:
        return parse(path.read_bytes())
    except (OSError, ValueError, KeyError, UnicodeDecodeError) as e:
        logger.warning("Skipping unreadable RPCS3 file %s: %s", path, e)
        return None


def _text(parse: Callable[[str], T]) -> Callable[[bytes], T]:
    return lambda data: parse(data.decode("utf-8"))


def _merge_unlocks(into: dict[tuple[str, int], int], set_id: str, unlocked: dict[int, int]) -> None:
    for trophy_id, when in unlocked.items():
        key = (set_id, trophy_id)
        if key not in into:
            into[key] = when
        elif when and (not into[key] or when < into[key]):
            into[key] = when


def _trophy_set_from_trp(trp: Path) -> TrophySet | None:
    return _read(trp, lambda data: parse_tropconf(parse_trp(data)["TROP.SFM"].decode("utf-8")))


def _load_sets(game: Rpcs3Game, roots: list[Path]) -> None:
    tropdir = game.game_dir / "PS3_GAME" / "TROPDIR" if game.game_dir else None
    if not tropdir or not tropdir.is_dir():
        return
    for set_id in sorted(p.name for p in tropdir.iterdir() if p.is_dir()):
        trophy_set = None
        for root in roots:
            user_dir = root / _USER_TROPHY_DIR / set_id
            if not user_dir.is_dir():
                continue
            conf = user_dir / "TROPCONF.SFM"
            if trophy_set is None and conf.is_file():
                trophy_set = _read(conf, _text(parse_tropconf))
            tropusr = user_dir / "TROPUSR.DAT"
            if tropusr.is_file():
                unlocked = _read(tropusr, parse_tropusr)
                if unlocked is not None:
                    _merge_unlocks(game.unlocks, set_id, unlocked)
            for icon in user_dir.iterdir():
                match = _TROPHY_ICON.match(icon.name)
                if match:
                    game.icon_paths.setdefault((set_id, int(match.group(1))), icon)
        trp = tropdir / set_id / "TROPHY.TRP"
        if trp.is_file():
            game.trp_paths[set_id] = trp
            if trophy_set is None:
                trophy_set = _trophy_set_from_trp(trp)
        if trophy_set is None:
            logger.warning("No trophy list found for RPCS3 set %s of %s", set_id, game.serial)
            continue
        game.sets[set_id] = trophy_set


def _game_name(game: Rpcs3Game) -> str:
    sfo = game.game_dir / "PS3_GAME" / "PARAM.SFO" if game.game_dir else None
    if sfo and sfo.is_file():
        title = _read(sfo, parse_sfo_title)
        if title:
            return title
    first_set = next(iter(game.sets.values()), None)
    if first_set and first_set.title:
        return first_set.title
    return game.game_dir.name if game.game_dir else game.serial


def scan(roots: list[Path]) -> dict[str, Rpcs3Game]:
    live_roots = []
    for root in roots:
        if root.is_dir():
            live_roots.append(root)
        else:
            logger.warning("RPCS3 install not found, skipping: %s", root)

    game_paths: dict[str, list[Path]] = {}
    playtime: dict[str, int] = {}
    last_played: dict[str, int] = {}
    for root in live_roots:
        listed = _read(root / "config" / "games.yml", _text(parse_games_yml)) or {}
        for serial, raw_path in listed.items():
            game_paths.setdefault(serial, []).append(windows_to_local(raw_path))
        settings_file = root / "GuiConfigs" / "persistent_settings.dat"
        times = _read(settings_file, _text(parse_persistent_settings)) if settings_file.is_file() else None
        for serial, ms in (times[0] if times else {}).items():
            playtime[serial] = playtime.get(serial, 0) + ms
        for serial, when in (times[1] if times else {}).items():
            last_played[serial] = max(last_played.get(serial, 0), when)

    library = {}
    for serial, paths in game_paths.items():
        game = Rpcs3Game(
            serial=serial,
            name=serial,
            playtime_ms=playtime.get(serial, 0),
            last_played=last_played.get(serial, 0),
            game_dir=next((p for p in paths if p.is_dir()), None),
        )
        _load_sets(game, live_roots)
        game.name = _game_name(game)
        library[serial] = game
    return library


def get_library() -> dict[str, Rpcs3Game]:
    global _cache
    roots = tuple(r.strip() for r in settings.rpcs3_roots.split(";") if r.strip())
    if _cache and _cache[1] == roots and time.time() - _cache[0] < _CACHE_TTL_SECONDS:
        return _cache[2]
    library = scan([Path(r) for r in roots])
    _cache = (time.time(), roots, library)
    return library


# --- Shaping for the API: RPCS3 data in the same shapes the frontend already uses for Steam.

RPCS3_ID_PREFIX = "rpcs3-"
_RECENT_UNLOCKS = 8
_GAME_IMAGES = {"icon0": "ICON0.PNG", "pic1": "PIC1.PNG"}


def _image_file(game: Rpcs3Game, kind: str) -> Path | None:
    name = _GAME_IMAGES.get(kind)
    if not name or not game.game_dir:
        return None
    path = game.game_dir / "PS3_GAME" / name
    return path if path.is_file() else None


def to_game_dict(game: Rpcs3Game) -> dict:
    image_url = lambda kind: f"/rpcs3/images/{game.serial}/{kind}" if _image_file(game, kind) else None
    return {
        "appid": RPCS3_ID_PREFIX + game.serial,
        "name": game.name,
        "source": "rpcs3",
        "playtime_forever": round(game.playtime_ms / 60000),
        "rtime_last_played": game.last_played,
        "banner_url": image_url("icon0"),
        "backdrop_url": image_url("pic1"),
    }


def achievements_for(game: Rpcs3Game) -> dict:
    achievements = []
    for set_id, trophy_set in game.sets.items():
        for trophy in trophy_set.trophies:
            key = (set_id, trophy.id)
            achieved = key in game.unlocks
            # Locked hidden trophies would spoil the game, so only their existence is shown.
            masked = trophy.hidden and not achieved
            icon = f"/rpcs3/images/{game.serial}/trophies/{set_id}/{trophy.id}"
            achievements.append({
                "apiname": f"{set_id}:{trophy.id}",
                "achieved": 1 if achieved else 0,
                "display_name": "Hidden trophy" if masked else trophy.name,
                "description": "" if masked else trophy.detail,
                "unlocktime": game.unlocks.get(key, 0),
                "icon": icon,
                "icongray": icon,
            })
    return {
        "has_achievements": bool(achievements),
        "achievements": achievements,
        "unlocked": sum(a["achieved"] for a in achievements),
        "total": len(achievements),
    }


def summary_for(game: Rpcs3Game) -> dict:
    data = achievements_for(game)
    # Undated unlocks (time 0) still count as unlocked, but would land at the epoch on the heat map and timeline.
    dated = sorted((a for a in data["achievements"] if a["achieved"] and a["unlocktime"] > 0),
                   key=lambda a: a["unlocktime"], reverse=True)
    return {
        "appid": RPCS3_ID_PREFIX + game.serial,
        "unlocked": data["unlocked"],
        "total": data["total"],
        "has_achievements": data["has_achievements"],
        "unlock_times": [a["unlocktime"] for a in dated],
        "recent_unlocks": [
            {k: a[k] for k in ("apiname", "display_name", "icon", "unlocktime")}
            for a in dated[:_RECENT_UNLOCKS]
        ],
    }


def get_image(serial: str, kind: str, set_id: str | None = None, trophy_id: int | None = None) -> bytes | None:
    """Image bytes for a scanned game, looked up only among files found by the scan, so ids can't reach arbitrary paths."""
    game = get_library().get(serial)
    if game is None:
        return None
    if kind != "trophy":
        path = _image_file(game, kind)
        return _read(path, bytes) if path else None
    trophy_set = game.sets.get(set_id) if set_id else None
    if trophy_set is None or trophy_id not in {t.id for t in trophy_set.trophies}:
        return None
    icon = game.icon_paths.get((set_id, trophy_id))
    if icon:
        return _read(icon, bytes)
    trp = game.trp_paths.get(set_id)
    if trp:
        files = _read(trp, parse_trp)
        return files.get(f"TROP{trophy_id:03d}.PNG") if files else None
    return None
