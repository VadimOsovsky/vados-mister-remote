import { useEffect, useState } from 'react';
import type { WizzoApi, WizzoPlayingResponse } from '../services/wizzoApi';
import { samePlayingGame } from '../services/nowPlaying';

const POLL_INTERVAL = 3000;
const REQUEST_TIMEOUT = 2500;
const RECONNECT_DELAY = 5000;

export function useNowPlaying(api: WizzoApi, connected: boolean) {
    const [snapshot, setSnapshot] = useState<{ api: WizzoApi; playing: WizzoPlayingResponse | null }>();

    useEffect(() => {
        if (!connected) return;
        let alive = true;
        let request: AbortController | undefined;
        let socket: WebSocket | undefined;
        let reconnect: ReturnType<typeof setTimeout> | undefined;

        async function refresh() {
            if (!alive || document.hidden) return;
            request?.abort();
            const current = new AbortController();
            request = current;
            const timeout = setTimeout(() => current.abort(), REQUEST_TIMEOUT);
            try {
                const playing = await api.getPlaying(current.signal);
                if (alive && request === current) {
                    const next = playing?.core ? playing : null;
                    setSnapshot(previous => previous?.api === api
                        && samePlayingGame(previous.playing, next)
                        ? previous : { api, playing: next });
                }
            } catch {
                if (alive && request === current) setSnapshot(previous =>
                    previous?.api === api && previous.playing === null ? previous : { api, playing: null });
            } finally {
                clearTimeout(timeout);
            }
        }

        function connect() {
            if (!alive) return;
            socket = api.connectWebSocket(event => {
                if (event.type === 'gameRunning' || event.type === 'coreRunning') void refresh();
            });
            socket.onopen = () => { void refresh(); };
            socket.onclose = () => {
                if (alive) reconnect = setTimeout(connect, RECONNECT_DELAY);
            };
        }

        void refresh();
        connect();
        // Polling covers missed events, older servers and reconnects.
        const poll = setInterval(() => { void refresh(); }, POLL_INTERVAL);
        const resume = () => { void refresh(); };
        document.addEventListener('visibilitychange', resume);
        window.addEventListener('focus', resume);
        return () => {
            alive = false;
            request?.abort();
            socket?.close();
            clearTimeout(reconnect);
            clearInterval(poll);
            document.removeEventListener('visibilitychange', resume);
            window.removeEventListener('focus', resume);
        };
    }, [api, connected]);

    return connected && snapshot?.api === api ? snapshot.playing : null;
}
