"""Minimal SPA-aware HTTP server for MiSTer.

Serves static files normally. For paths that don't match a file,
serves index.html so the client-side router can handle them.
"""

import http.server
import json
import os
import sys
import threading
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


STATE_ROUTE = "/api/playroom/state"
STATE_LOCK = threading.Lock()
MAX_STATE_BYTES = 4 * 1024 * 1024


def read_state():
    try:
        return json.loads(state_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"revision": 0, "values": {}}


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
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
