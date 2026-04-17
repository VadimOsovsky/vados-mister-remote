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

# Check busybox httpd is available
if ! ssh "$MISTER_USER@$MISTER_IP" "busybox httpd --help" >/dev/null 2>&1; then
  echo "Error: busybox httpd not available on MiSTer"
  exit 1
fi

echo "==> Building..."
yarn build

echo "==> Uploading to MiSTer..."
ssh "$MISTER_USER@$MISTER_IP" "mkdir -p $REMOTE_DIR"
# Upload everything except assets/ (those are on CDN)
scp -r dist/index.html dist/manifest.webmanifest dist/registerSW.js dist/sw.js \
       dist/favicon.svg dist/icons.svg dist/pwa-192x192.png dist/pwa-512x512.png \
       "$MISTER_USER@$MISTER_IP:$REMOTE_DIR/"

echo "==> Setting up HTTP server..."
ssh "$MISTER_USER@$MISTER_IP" bash <<'REMOTE_EOF'
REMOTE_DIR="/media/fat/remote"
HTTP_PORT=8183
STARTUP="/media/fat/linux/user-startup.sh"
MARKER="# mister-remote"

# Start httpd now (kill old instance first)
pkill -f "httpd -p $HTTP_PORT" 2>/dev/null || true
busybox httpd -p "$HTTP_PORT" -h "$REMOTE_DIR"
echo "httpd started on port $HTTP_PORT"

# Add to startup if not already there
if ! grep -q "$MARKER" "$STARTUP" 2>/dev/null; then
  printf '\n%s\n' "$MARKER" >> "$STARTUP"
  echo "[[ -e $REMOTE_DIR/index.html ]] && busybox httpd -p $HTTP_PORT -h $REMOTE_DIR" >> "$STARTUP"
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
