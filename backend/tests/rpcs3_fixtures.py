"""Builders for RPCS3 files, following the layouts recorded in the RPCS3 design spec."""
import struct
from xml.sax.saxutils import escape

_PS3_EPOCH_OFFSET = 62_135_596_800  # seconds from 0001-01-01 to 1970-01-01


def make_tropusr(unlocked: dict[int, int], total: int) -> bytes:
    entry_size = 96  # payload after the 16-byte entry header
    header = struct.pack(">IIII", 0x818F54AD, 0, 1, 0) + b"\0" * 32
    table = struct.pack(">IIIIQQ", 6, entry_size, 0, total, 48 + 32, 0)
    entries = b""
    for trophy_id in range(total):
        unix = unlocked.get(trophy_id)
        state = 1 if unix is not None else 0
        ts2 = (unix + _PS3_EPOCH_OFFSET) * 1_000_000 if unix else 0
        entries += struct.pack(">IIIIIIIIQQ", 6, entry_size, trophy_id, 0, trophy_id, state, 0, 0, ts2, ts2) + b"\0" * 64
    return header + table + entries


def make_trp(files: dict[str, bytes]) -> bytes:
    entry_size = 64
    table_end = 0x40 + entry_size * len(files)
    table = b""
    data = b""
    for name, content in files.items():
        table += struct.pack(">32sQQ", name.encode(), table_end + len(data), len(content)) + b"\0" * 16
        data += content
    header = struct.pack(">IIQII", 0xDCA24D00, 1, table_end + len(data), len(files), entry_size)
    return header.ljust(0x40, b"\0") + table + data


def make_tropconf(title: str | None, trophies: list[tuple[int, str, str, bool]]) -> str:
    title_xml = f"<title-name>{escape(title)}</title-name>" if title is not None else ""
    trophy_xml = "".join(
        f'<trophy id="{tid:03d}" hidden="{"yes" if hidden else "no"}" ttype="B" pid="000">'
        f"<name>{escape(name)}</name><detail>{escape(detail)}</detail></trophy>"
        for tid, name, detail, hidden in trophies
    )
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<trophyconf version="1.0"><npcommid>NPWR00000_00</npcommid>{title_xml}{trophy_xml}</trophyconf>'


def make_sfo(title: str) -> bytes:
    items = [("CATEGORY", "DG"), ("TITLE", title)]
    keys = b""
    values = b""
    index = b""
    for key, value in items:
        encoded = value.encode() + b"\0"
        max_len = (len(encoded) + 3) // 4 * 4
        index += struct.pack("<HHIII", len(keys), 0x0204, len(encoded), max_len, len(values))
        keys += key.encode() + b"\0"
        values += encoded.ljust(max_len, b"\0")
    keys = keys.ljust((len(keys) + 3) // 4 * 4, b"\0")
    key_table = 20 + len(index)
    header = struct.pack("<4sIIII", b"\0PSF", 0x101, key_table, key_table + len(keys), len(items))
    return header + index + keys + values
