"""Minimal SPA-aware HTTP server for MiSTer.

Serves static files normally. For paths that don't match a file,
redirects to / so the client-side router can handle them.
"""

import http.server
import os
import sys


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Build the filesystem path for the request
        path = self.translate_path(self.path)

        # If the path exists as a file, serve it normally
        if os.path.isfile(path):
            return super().do_GET()

        # If it's a directory with index.html, serve normally
        if os.path.isdir(path) and os.path.isfile(os.path.join(path, "index.html")):
            return super().do_GET()

        # Otherwise redirect to root (SPA fallback)
        self.send_response(302)
        self.send_header("Location", "/")
        self.end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8183
    directory = sys.argv[2] if len(sys.argv) > 2 else "."

    os.chdir(directory)
    server = http.server.HTTPServer(("", port), SPAHandler)
    print(f"SPA server on port {port}, serving {directory}")
    server.serve_forever()
