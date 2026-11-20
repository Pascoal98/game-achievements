"""Slow-changing Steam data in SQLite, so they survive restarts.

A connection per call keeps it safe for the summary's thread pool; each call is a few
milliseconds, far below the Steam calls it saves.
"""
import json
import sqlite3
import time
from contextlib import closing
from pathlib import Path

from app.config import settings


def _connect() -> sqlite3.Connection:
    path = Path(settings.db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path, timeout=10)
    # WAL lets the summary's threads read while one of them writes.
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("CREATE TABLE IF NOT EXISTS cache (kind TEXT, key TEXT, value TEXT NOT NULL, fetched_at REAL NOT NULL, PRIMARY KEY (kind, key))")
    return con


def get_many(kind: str, keys: list[str], max_age: float | None = None) -> dict:
    """Stored values by key; missing keys and entries older than max_age seconds are left out."""
    if not keys:
        return {}
    oldest = time.time() - max_age if max_age is not None else float("-inf")
    placeholders = ",".join("?" * len(keys))
    with closing(_connect()) as con:
        rows = con.execute(
            f"SELECT key, value FROM cache WHERE kind = ? AND fetched_at >= ? AND key IN ({placeholders})",
            [kind, oldest, *keys],
        ).fetchall()
    return {key: json.loads(value) for key, value in rows}


def put_many(kind: str, values: dict) -> None:
    now = time.time()
    with closing(_connect()) as con, con:
        con.executemany(
            "INSERT OR REPLACE INTO cache (kind, key, value, fetched_at) VALUES (?, ?, ?, ?)",
            [(kind, key, json.dumps(value), now) for key, value in values.items()],
        )

