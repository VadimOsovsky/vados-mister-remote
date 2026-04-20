#!/bin/bash
set -e

MISTER_IP="${1:-$MISTER_IP}"
MISTER_USER="root"
REMOTE_DIR="/media/fat/remote"
HTTP_PORT=8183

if [ -z "$MISTER_IP" ]; then
  echo "Usage: $0 <mister-ip>"
  echo "  or:  MISTER_IP=192.168.x.x $0"
  exit 1
fi

# Check SSH connectivity
echo "==> Checking connection to MiSTer ($MISTER_IP)..."
if ! ssh -o ConnectTimeout=5 "$MISTER_USER@$MISTER_IP" "true" 2>/dev/null; then
  echo "Error: Cannot connect to $MISTER_USER@$MISTER_IP via SSH"
  echo "Make sure MiSTer is on and SSH is accessible (default password: 1)"
  exit 1
fi

# Check python3 is available (for HTTP server)
PYTHON_BIN=$(ssh "$MISTER_USER@$MISTER_IP" "which python3 || which python" 2>/dev/null)
if [ -z "$PYTHON_BIN" ]; then
  echo "Error: python3/python not found on MiSTer"
  exit 1
fi

echo "==> Building..."
yarn build

echo "==> Cleaning old files on MiSTer..."
ssh "$MISTER_USER@$MISTER_IP" "rm -rf $REMOTE_DIR/*"

echo "==> Uploading to MiSTer..."
ssh "$MISTER_USER@$MISTER_IP" "mkdir -p $REMOTE_DIR/launchbox"
# Upload everything except assets/ (those are on CDN)
scp -r dist/index.html dist/manifest.webmanifest dist/registerSW.js dist/sw.js \
       dist/favicon.svg dist/icons.svg dist/pwa-192x192.png dist/pwa-512x512.png \
       "$MISTER_USER@$MISTER_IP:$REMOTE_DIR/"
# Upload LaunchBox game metadata
scp public/launchbox/nes.json "$MISTER_USER@$MISTER_IP:$REMOTE_DIR/launchbox/"

echo "==> Setting up HTTP server..."
ssh "$MISTER_USER@$MISTER_IP" bash <<REMOTE_EOF
REMOTE_DIR="/media/fat/remote"
HTTP_PORT=8183
PYTHON_BIN="$PYTHON_BIN"
STARTUP="/media/fat/linux/user-startup.sh"
MARKER="# mister-remote"
SERVER_CMD="\$PYTHON_BIN -m http.server \$HTTP_PORT -d \$REMOTE_DIR"

# Start python http server now (kill old instance first)
pkill -f "http.server \$HTTP_PORT" 2>/dev/null || true
nohup \$SERVER_CMD >/dev/null 2>&1 &
echo "python http.server started on port \$HTTP_PORT"

# Add to startup if not already there
if ! grep -q "\$MARKER" "\$STARTUP" 2>/dev/null; then
  printf '\n%s\n' "\$MARKER" >> "\$STARTUP"
  echo "[[ -e \$REMOTE_DIR/index.html ]] && nohup \$SERVER_CMD >/dev/null 2>&1 &" >> "\$STARTUP"
  echo "Added to user-startup.sh"
else
  echo "Already in user-startup.sh"
fi
REMOTE_EOF

echo ""
echo "Ready! Open on your phone:"
echo "  http://$MISTER_IP:$HTTP_PORT"
echo ""
echo "Then: Share -> Add to Home Screen"
