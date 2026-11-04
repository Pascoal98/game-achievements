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
