import { useEffect, useMemo, useState } from 'react';
import { WizzoApi } from '../services/wizzoApi';

export function useConnection(host: string) {
    const [connected, setConnected] = useState(false);
    const api = useMemo(() => new WizzoApi(host), [host]);

    useEffect(() => {
        let alive = true;

        async function poll() {
            try {
                await api.getSysInfo();
                if (alive) setConnected(true);
            } catch {
                if (alive) setConnected(false);
            }
        }

        poll();
        const pollTimer = setInterval(poll, 10_000);

        return () => {
            alive = false;
            clearInterval(pollTimer);
        };
    }, [api]);

    return { connected, api };
}
