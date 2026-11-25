#!/bin/sh
set -eu

install_dir=/media/fat/linux/playroom-caddy
state_dir=/run/playroom-caddy-private
pidfile=/run/mister-playroom-caddy.pid

start() {
    [ -x "$install_dir/caddy" ] || return 0
    prepare_state
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

prepare_state() {
    grep -Fq '/playroom-caddy/state.img/' /etc/samba/smb.conf
    grep -Fq '<Directory /media/fat/linux/playroom-caddy>' /etc/proftpd.conf
    mkdir -m 700 -p "$state_dir"
    mountpoint -q "$state_dir" || mount -o loop,nosuid,nodev,noexec "$install_dir/state.img" "$state_dir"
}

set_token() {
    [ -t 0 ] || { printf 'An interactive terminal is required.\n' >&2; exit 1; }
    prepare_state
    umask 077
    trap 'stty echo' EXIT
    trap 'exit 1' HUP INT TERM
    printf 'DuckDNS token: ' >&2
    stty -echo
    IFS= read -r token
    stty echo
    printf '\n' >&2
    case "$token" in
        ''|*[!a-zA-Z0-9-]*) printf 'Invalid DuckDNS token format.\n' >&2; exit 1 ;;
    esac
    printf '%s\n' "$token" >"$state_dir/duckdns-token.new"
    mv "$state_dir/duckdns-token.new" "$state_dir/duckdns-token"
    unset token
    sync
    printf 'DuckDNS token saved.\n'
}

stop() {
    start-stop-daemon -K -q -p "$pidfile" -x "$install_dir/caddy" || true
    rm -f "$pidfile"
}

case "${1:-}" in
    start) start ;;
    stop) stop ;;
    restart) stop; start ;;
    set-token) set_token ;;
    *) exit 2 ;;
esac
