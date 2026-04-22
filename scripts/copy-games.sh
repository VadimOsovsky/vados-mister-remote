#!/bin/bash
set -e

MISTER_IP="${1:-$MISTER_IP}"
MISTER_USER="root"
GAMES_LOCAL="$(cd "$(dirname "$0")/.." && pwd)/games"
GAMES_REMOTE="/media/fat/games"

if [ -z "$MISTER_IP" ]; then
  echo "Usage: $0 <mister-ip>"
  echo "  or:  MISTER_IP=192.168.x.x $0"
  exit 1
fi

if [ ! -d "$GAMES_LOCAL" ]; then
  echo "Error: games/ folder not found at $GAMES_LOCAL"
  echo "Create it and add ROMs organized by system, e.g.:"
  echo "  games/NES/rom.nes"
  echo "  games/SNES/rom.sfc"
  echo "  games/Genesis/rom.md"
  exit 1
fi

# Check if games folder has any content
if [ -z "$(ls -A "$GAMES_LOCAL" 2>/dev/null)" ]; then
  echo "Error: games/ folder is empty"
  exit 1
fi

# SSH multiplexing — one connection, one password prompt
SSH_CONTROL="/tmp/mister-games-$$"
SSH_OPTS="-o ControlMaster=auto -o ControlPath=$SSH_CONTROL -o ControlPersist=60"

ssh_cmd() { ssh $SSH_OPTS "$MISTER_USER@$MISTER_IP" "$@"; }
scp_cmd() { scp $SSH_OPTS "$@"; }

cleanup() { ssh -o ControlPath="$SSH_CONTROL" -O exit "$MISTER_USER@$MISTER_IP" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> Checking connection to MiSTer ($MISTER_IP)..."
if ! ssh_cmd -o ConnectTimeout=5 "true" 2>/dev/null; then
  echo "Error: Cannot connect to $MISTER_USER@$MISTER_IP via SSH"
  echo "Make sure MiSTer is on and SSH is accessible (default password: 1)"
  exit 1
fi

echo "==> Copying games to MiSTer..."
COPIED=0
SKIPPED=0

for SYSTEM_DIR in "$GAMES_LOCAL"/*/; do
  [ -d "$SYSTEM_DIR" ] || continue
  SYSTEM=$(basename "$SYSTEM_DIR")

  # Get list of files already on MiSTer for this system
  REMOTE_FILES=$(ssh_cmd "ls '$GAMES_REMOTE/$SYSTEM/' 2>/dev/null" || true)

  find "$SYSTEM_DIR" -type f | while read -r LOCAL_FILE; do
    FILENAME=$(basename "$LOCAL_FILE")
    if echo "$REMOTE_FILES" | grep -qxF "$FILENAME"; then
      echo "    skip: $SYSTEM/$FILENAME (already exists)"
      echo "S" >> "/tmp/mister-games-count-$$"
    else
      ssh_cmd "mkdir -p '$GAMES_REMOTE/$SYSTEM'"
      scp_cmd "$LOCAL_FILE" "$MISTER_USER@$MISTER_IP:$GAMES_REMOTE/$SYSTEM/"
      echo "    copy: $SYSTEM/$FILENAME"
      echo "C" >> "/tmp/mister-games-count-$$"
    fi
  done
done

# Count results from subshell
if [ -f "/tmp/mister-games-count-$$" ]; then
  COPIED=$(grep -c '^C$' "/tmp/mister-games-count-$$" 2>/dev/null || echo 0)
  SKIPPED=$(grep -c '^S$' "/tmp/mister-games-count-$$" 2>/dev/null || echo 0)
  rm -f "/tmp/mister-games-count-$$"
fi

echo ""
echo "Done! Copied: $COPIED, skipped: $SKIPPED."
