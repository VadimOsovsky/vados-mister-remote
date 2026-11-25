#!/bin/sh
set -eu

install_dir=/media/fat/linux/playroom-caddy
state_dir=/var/lib/mister-playroom-caddy
pidfile=/run/mister-playroom-caddy.pid

start() {
    [ -s "$state_dir/duckdns-token" ] || return 0

    for attempt in $(seq 1 60); do
        if ip -4 addr show | grep -q 'inet 192\.168\.0\.118/'; then
            break
        fi
        sleep 2
    done
    ip -4 addr show | grep -q 'inet 192\.168\.0\.118/' || return 1

    export XDG_DATA_HOME="$state_dir/data"
    export XDG_CONFIG_HOME="$state_dir/config"
    export SSL_CERT_FILE="$install_dir/ca-bundle.pem"
    DUCKDNS_API_TOKEN=$(cat "$state_dir/duckdns-token")
    export DUCKDNS_API_TOKEN
    umask 077
    start-stop-daemon -S -q -b -m -p "$pidfile" -x "$install_dir/caddy" -- \
        run --config "$install_dir/Caddyfile" --adapter caddyfile >/dev/null 2>&1
}

stop() {
    start-stop-daemon -K -q -p "$pidfile" -x "$install_dir/caddy" || true
    rm -f "$pidfile"
}

case "${1:-}" in
    start) start ;;
    stop) stop ;;
    restart) stop; start ;;
    *) exit 2 ;;
esac
