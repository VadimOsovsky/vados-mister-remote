import { useEffect, useState } from 'react';
import type { WizzoApi } from '../services/wizzoApi';

export function useConnection(api: WizzoApi) {
    const [connectedApi, setConnectedApi] = useState<WizzoApi>();

    useEffect(() => {
        let alive = true;

        async function poll() {
            try {
                await api.getSysInfo();
                if (alive) setConnectedApi(api);
            } catch {
                if (alive) setConnectedApi(undefined);
            }
        }

        poll();
        const pollTimer = setInterval(poll, 10_000);

        return () => {
            alive = false;
            clearInterval(pollTimer);
        };
    }, [api]);

    return connectedApi === api;
}
