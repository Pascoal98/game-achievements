"""Read-only parsers for the RPCS3 files the library uses.

Each parser takes bytes or text and returns plain data, raising ValueError on malformed
input so callers can skip one bad file without losing the rest.
"""
import configparser
import os
import re
import struct
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

_TROPUSR_MAGIC = 0x818F54AD
_TRP_MAGIC = 0xDCA24D00
_TROPUSR_STATE_TABLE = 6
_PS3_EPOCH_OFFSET = 62_135_596_800  # seconds from 0001-01-01 to 1970-01-01
_DRIVE_PATH = re.compile(r"^([A-Za-z]):[\\/](.*)$")


@dataclass(frozen=True)
class Trophy:
    id: int
    name: str
    detail: str
    hidden: bool


@dataclass(frozen=True)
class TrophySet:
    title: str
    trophies: tuple[Trophy, ...]


def windows_to_local(path: str) -> Path:
    """RPCS3 runs on Windows, so games.yml holds paths like E:/PS3/games//X/; under WSL those live in /mnt/e."""
    match = _DRIVE_PATH.match(path)
    if not match or os.name == "nt":
        return Path(path)
    drive, rest = match.groups()
    parts = [p for p in re.split(r"[\\/]", rest) if p]
    return Path("/mnt", drive.lower(), *parts)


def parse_games_yml(text: str) -> dict[str, str]:
    games = {}
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        serial, sep, path = line.partition(": ")
        if not sep:
            raise ValueError(f"unexpected games.yml line: {line!r}")
        games[serial.strip()] = path.strip().strip("'\"")
    return games


def parse_persistent_settings(text: str) -> tuple[dict[str, int], dict[str, int]]:
    parser = configparser.ConfigParser(interpolation=None, strict=False)
    parser.optionxform = str  # serials are case-sensitive keys
    try:
        parser.read_string(text)
    except configparser.Error as e:
        raise ValueError(f"unreadable persistent settings: {e}") from e
    playtime = {k: int(v) for k, v in parser.items("Playtime")} if parser.has_section("Playtime") else {}
    # LastPlayed has no timezone; RPCS3 writes the PC's local time, which is what a naive timestamp() assumes.
    last = (
        {k: int(datetime.fromisoformat(v).timestamp()) for k, v in parser.items("LastPlayed")}
        if parser.has_section("LastPlayed")
        else {}
    )
    return playtime, last


def parse_tropusr(data: bytes) -> dict[int, int]:
    try:
        magic, _, table_count, _ = struct.unpack_from(">IIII", data, 0)
        if magic != _TROPUSR_MAGIC:
            raise ValueError(f"not a TROPUSR.DAT (magic {magic:#x})")
        unlocked = {}
        for t in range(table_count):
            table_type, entry_size, _, count, offset, _ = struct.unpack_from(">IIIIQQ", data, 48 + t * 32)
            if table_type != _TROPUSR_STATE_TABLE:
                continue
            for i in range(count):
                fields = struct.unpack_from(">IIIIIIIIQQ", data, offset + i * (entry_size + 16))
                trophy_id, state, ts2 = fields[4], fields[5], fields[9]
                if state:
                    unlocked[trophy_id] = ts2 // 1_000_000 - _PS3_EPOCH_OFFSET if ts2 else 0
        return unlocked
    except struct.error as e:
        raise ValueError(f"truncated TROPUSR.DAT: {e}") from e


def parse_trp(data: bytes) -> dict[str, bytes]:
    try:
        magic, _, _, count, entry_size = struct.unpack_from(">IIQII", data, 0)
        if magic != _TRP_MAGIC:
            raise ValueError(f"not a TROPHY.TRP (magic {magic:#x})")
        files = {}
        for i in range(count):
            raw_name, offset, size = struct.unpack_from(">32sQQ", data, 0x40 + i * entry_size)
            if offset + size > len(data):
                raise ValueError("TROPHY.TRP entry points past end of file")
            files[raw_name.rstrip(b"\0").decode("ascii", "replace")] = data[offset:offset + size]
        return files
    except struct.error as e:
        raise ValueError(f"truncated TROPHY.TRP: {e}") from e


def parse_tropconf(text: str) -> TrophySet:
    # Trophy XML can carry padding NULs and a BOM; ElementTree also rejects str input that declares an encoding.
    cleaned = text.strip("\0\ufeff \r\n\t")
    try:
        root = ET.fromstring(cleaned.encode("utf-8"))
    except ET.ParseError as e:
        raise ValueError(f"unreadable trophy XML: {e}") from e
    trophies = tuple(
        Trophy(
            id=int(t.get("id", "")),
            name=(t.findtext("name") or "").strip(),
            detail=(t.findtext("detail") or "").strip(),
            hidden=t.get("hidden", "no") == "yes",
        )
        for t in root.iter("trophy")
    )
    return TrophySet(title=(root.findtext("title-name") or "").strip(), trophies=trophies)


def parse_sfo_title(data: bytes) -> str:
    try:
        magic, _, key_table, data_table, count = struct.unpack_from("<4sIIII", data, 0)
        if magic != b"\0PSF":
            raise ValueError("not a PARAM.SFO")
        for i in range(count):
            key_off, _, length, _, data_off = struct.unpack_from("<HHIII", data, 20 + i * 16)
            key_end = data.index(b"\0", key_table + key_off)
            if data[key_table + key_off:key_end] == b"TITLE":
                start = data_table + data_off
                return data[start:start + length].rstrip(b"\0").decode("utf-8")
    except (struct.error, UnicodeDecodeError) as e:
        raise ValueError(f"unreadable PARAM.SFO: {e}") from e
    raise ValueError("PARAM.SFO has no TITLE")
