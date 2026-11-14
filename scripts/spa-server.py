"""Minimal SPA-aware HTTP server for MiSTer.

Serves static files normally. For paths that don't match a file,
serves index.html so the client-side router can handle them.
"""

import errno
import http.server
import fcntl
import json
import os
import re
import sys
import termios
import threading
import time
import zipfile
import zlib
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


STATE_ROUTE = "/api/playroom/state"
STATE_LOCK = threading.Lock()
MAX_STATE_BYTES = 4 * 1024 * 1024
CHEATS_ROUTE = "/api/playroom/cheats"
CHEATS_LOCK = threading.Lock()
MEDIA_ROOT = Path("/media")
ACTIVE_GAME = Path("/tmp/ACTIVEGAME")
MAX_NES_BYTES = 64 * 1024 * 1024


def nes_rom_path(value):
    if not isinstance(value, str) or len(value) > 1024 or any(c in value for c in "\0\r\n\\"):
        raise ValueError("Invalid ROM path")
    path = Path(value)
    if ".." in path.parts or path.suffix.lower() != ".nes":
        raise ValueError("Choose a .nes ROM to use cheats.")
    if not path.is_absolute():
        path = MEDIA_ROOT / "fat" / path
    if not path.resolve().is_relative_to(MEDIA_ROOT):
        raise ValueError("Invalid ROM path")
    return path


def rom_checksum(rom):
    for parent in rom.parents:
        if parent.suffix.lower() == ".zip" and parent.is_file():
            with zipfile.ZipFile(parent) as archive:
                entry = archive.getinfo(rom.relative_to(parent).as_posix())
                if entry.file_size > MAX_NES_BYTES:
                    raise ValueError("ROM is too large.")
                return checksum_stream(archive.open(entry), entry.file_size)
    return checksum_stream(rom.open("rb"), rom.stat().st_size)


def checksum_stream(stream, size):
    with stream:
        if size > MAX_NES_BYTES:
            raise ValueError("ROM is too large.")
        stream.read(size & 1023)
        crc = 0
        for chunk in iter(lambda: stream.read(65536), b""):
            crc = zlib.crc32(chunk, crc)
        return f"{crc:08X}"


def cheat_entries(rom):
    folder = MEDIA_ROOT / "fat" / "cheats" / "NES"
    candidates = [rom.with_suffix(".zip"), folder / rom.with_suffix(".zip").name]
    for path in candidates:
        if path.is_file() and zipfile.is_zipfile(path):
            break
    else:
        if not folder.is_dir():
            return {}
        try:
            crc = rom_checksum(rom)
        except (FileNotFoundError, KeyError):
            return {}
        matches = sorted(p for p in folder.iterdir() if p.name.upper().endswith(f"[{crc}].ZIP"))
        if len(matches) > 1:
            # Some archive names share a CRC. Prefer the archive named for this ROM.
            expected_name = f"{rom.stem} [{crc}].zip".casefold()
            matches = [p for p in matches if p.name.casefold() == expected_name]
        if len(matches) != 1:
            return {}
        path = matches[0]
    with zipfile.ZipFile(path) as archive:
        return {
            entry.filename: entry.file_size // 16
            for entry in archive.infolist()
            if entry.filename.lower().endswith(".gg")
            and len(entry.filename.encode()) < 256
            and entry.filename == entry.filename.strip()
            and not any(c in entry.filename for c in "\0\r\n")
            and 0 < entry.file_size <= 32 * 16 and entry.file_size % 16 == 0
        }


def supports_cheats():
    for executable in Path("/proc").glob("[0-9]*/exe"):
        try:
            if executable.readlink().name in {"MiSTer", "MiSTer_Zaparoo"}:
                if b"zaparoo_cheat" in executable.read_bytes():
                    return True
        except OSError:
            pass
    return False


def active_game_revision():
    try:
        return str(ACTIVE_GAME.stat().st_mtime_ns)
    except FileNotFoundError:
        return ""


def read_state():
    try:
        return json.loads(state_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"revision": 0, "values": {}}


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != CHEATS_ROUTE:
            return self.send_error(404)
        if self.headers.get("Origin") != "http://" + self.headers.get("Host", ""):
            return self.send_error(403)
        if self.headers.get_content_type() != "application/json":
            return self.send_error(415)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16384:
                return self.send_error(413)
            request = json.loads(self.rfile.read(length))
            rom = nes_rom_path(request["rom"])
            names = request["names"]
            previous = request["previous"]
            if not isinstance(previous, str):
                raise ValueError("Invalid launch revision.")
            if not isinstance(names, list) or not 0 < len(names) <= 32 or not all(isinstance(n, str) for n in names):
                raise ValueError("Invalid cheat selection.")
            with CHEATS_LOCK:
                revision = active_game_revision()
                try:
                    active = ACTIVE_GAME.read_text().strip()
                except FileNotFoundError:
                    active = ""
                if (revision == previous or not active.lower().endswith(".nes")
                        or nes_rom_path(active).resolve() != rom.resolve()):
                    return self.send_json(425, {"error": "The selected ROM is not active on MiSTer."})
                entries = cheat_entries(rom)
                if len(set(names)) != len(names) or any(n not in entries for n in names):
                    raise ValueError("Cheat list changed. Reopen the Cheats tab.")
                if sum(entries[n] for n in names) > 32:
                    raise ValueError("The NES core supports up to 32 codes.")
                if not supports_cheats():
                    return self.send_json(409, {"error": "Start MiSTer with Zaparoo Main to apply cheats."})
                try:
                    fd = os.open("/dev/MiSTer_cmd", os.O_WRONLY | os.O_NONBLOCK)
                except OSError as error:
                    if error.errno in {errno.ENOENT, errno.ENXIO}:
                        return self.send_json(425, {"error": "MiSTer is still opening its command interface."})
                    raise
                try:
                    for name in names:
                        # MiSTer can read adjacent FIFO writes as one command.
                        pending = bytearray(4)
                        deadline = time.monotonic() + 1
                        while True:
                            fcntl.ioctl(fd, termios.FIONREAD, pending)
                            if int.from_bytes(pending, sys.byteorder) == 0:
                                break
                            if time.monotonic() >= deadline:
                                raise TimeoutError("MiSTer command queue did not drain")
                            time.sleep(0.01)
                        if active_game_revision() != revision:
                            return self.send_json(409, {"error": "The active ROM changed before cheats could be applied."})
                        os.write(fd, f"zaparoo_cheat on {name}\n".encode())
                finally:
                    os.close(fd)
        except (ValueError, KeyError, TypeError) as error:
            return self.send_json(400, {"error": str(error)})
        except (OSError, zipfile.BadZipFile) as error:
            self.log_error("Could not send cheats: %s", error)
            return self.send_json(503, {"error": "MiSTer could not receive the selected cheats."})
        return self.send_json(200, {"queued": True})

    def is_versioned_asset(self):
        return bool(re.fullmatch(r"/assets/[^/]+-[A-Za-z0-9_-]{8,}\.[^/]+", urlsplit(self.path).path))

    def end_headers(self):
        # HTML, metadata and worker scripts keep stable URLs across releases.
        # Only build assets with content hashes can be cached indefinitely.
        policy = "public, max-age=31536000, immutable" if self.is_versioned_asset() else "no-store"
        self.send_header("Cache-Control", policy)
        super().end_headers()

    def send_head(self):
        if not self.is_versioned_asset():
            # Old clients may still send validators for a previously cached shell.
            for header in ("If-Modified-Since", "If-None-Match"):
                if header in self.headers:
                    del self.headers[header]
        return super().send_head()

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_PUT(self):
        if self.path != STATE_ROUTE:
            return self.send_error(404)

        # Writes are only accepted from the app served by this instance.
        origin = self.headers.get("Origin")
        if origin and origin != "http://" + self.headers.get("Host", ""):
            return self.send_error(403)
        if self.headers.get_content_type() != "application/json":
            return self.send_error(415)

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_STATE_BYTES:
                return self.send_error(413)
            update = json.loads(self.rfile.read(length))
            revision = update["revision"]
            values = update["values"]
            if type(revision) is not int or not isinstance(values, dict):
                raise ValueError()
            if not all(isinstance(value, str) for value in values.values()):
                raise ValueError()
        except (ValueError, KeyError, TypeError):
            return self.send_error(400)

        try:
            with STATE_LOCK:
                current = read_state()
                if values == current["values"] and current["revision"] > 0:
                    result = current
                elif revision != current["revision"]:
                    result = None
                else:
                    result = {"revision": revision + 1, "values": values}
                    state_path.parent.mkdir(parents=True, exist_ok=True)
                    temporary = state_path.with_suffix(".tmp")
                    with temporary.open("w", encoding="utf-8") as stream:
                        json.dump(result, stream)
                        stream.flush()
                        os.fsync(stream.fileno())
                    os.replace(temporary, state_path)
        except (OSError, ValueError):
            return self.send_error(500)
        if result is None:
            return self.send_json(409, {"error": "Shared data has changed"})
        return self.send_json(200, result)

    def do_GET(self):
        request = urlsplit(self.path)
        if request.path == CHEATS_ROUTE:
            query = parse_qs(request.query)
            try:
                rom = nes_rom_path(query.get("rom", [""])[0])
                entries = cheat_entries(rom)
                return self.send_json(200, {
                    "supported": supports_cheats(),
                    "revision": active_game_revision(),
                    "entries": [{"id": name, "codes": entries[name]} for name in sorted(entries, key=str.casefold)],
                })
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})
            except (OSError, zipfile.BadZipFile):
                return self.send_json(503, {"error": "Could not read the MiSTer cheat archive."})
        if request.path == "/api/playroom/save-state":
            query = parse_qs(request.query)
            core = query.get("core", [""])[0]
            game = query.get("game", [""])[0]
            slot = query.get("slot", [""])[0]
            if core not in {"NES", "FDS"} or slot not in {"1", "2", "3", "4"}:
                return self.send_error(400)
            if not game or game in {".", ".."} or any(c in game for c in "/\\\0"):
                return self.send_error(400)
            path = Path("/media/fat/savestates") / core / f"{game}_{slot}.ss"
            try:
                info = path.stat()
                version = str(info.st_mtime_ns) if info.st_size > 0 else None
            except FileNotFoundError:
                version = None
            except OSError:
                return self.send_error(500)
            return self.send_json(200, {"version": version})

        if request.path == STATE_ROUTE:
            try:
                with STATE_LOCK:
                    state = read_state()
            except (OSError, ValueError):
                return self.send_error(500)
            return self.send_json(200, state)

        # Build the filesystem path for the request
        path = self.translate_path(self.path)

        # If the path exists as a file, serve it normally
        if os.path.isfile(path):
            return super().do_GET()

        # If it's a directory with index.html, serve normally
        if os.path.isdir(path) and os.path.isfile(os.path.join(path, "index.html")):
            return super().do_GET()

        # Missing assets should still return 404.
        if os.path.splitext(path)[1]:
            return super().do_GET()

        self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8183
    directory = sys.argv[2] if len(sys.argv) > 2 else "."
    # Keep the data next to the deployment directory so uploads never erase it.
    state_path = Path(directory).resolve().parent / "playroom-data" / "state.json"

    os.chdir(directory)
    server = http.server.ThreadingHTTPServer(("", port), SPAHandler)
    print(f"SPA server on port {port}, serving {directory}")
    server.serve_forever()
