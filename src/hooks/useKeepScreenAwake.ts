import { useEffect, useState } from 'react';

const preferenceKey = 'playroom.keep-screen-awake';

export function useKeepScreenAwake() {
    const supported = typeof navigator.wakeLock?.request === 'function';
    const [enabled, setEnabled] = useState(() => {
        try { return localStorage.getItem(preferenceKey) === 'true'; }
        catch { return false; }
    });
    const [active, setActive] = useState(false);

    function setPreference(value: boolean) {
        setEnabled(value);
        if (!value) setActive(false);
        try { localStorage.setItem(preferenceKey, String(value)); }
        catch { /* Use the preference for the current session. */ }
    }

    useEffect(() => {
        if (!enabled || !supported) return;

        let disposed = false;
        let requesting = false;
        let lock: WakeLockSentinel | undefined;

        function release() {
            const current = lock;
            lock = undefined;
            if (current && !current.released) void current.release().catch(() => undefined);
        }

        async function update() {
            if (document.visibilityState !== 'visible') {
                release();
                setActive(false);
                return;
            }
            if (requesting || (lock && !lock.released)) return;

            requesting = true;
            try {
                const acquired = await navigator.wakeLock.request('screen');
                if (disposed || document.visibilityState !== 'visible') {
                    await acquired.release();
                    return;
                }
                lock = acquired;
                setActive(!acquired.released);
                acquired.addEventListener('release', () => {
                    if (lock !== acquired) return;
                    lock = undefined;
                    setActive(false);
                }, { once: true });
            } catch {
                if (!disposed) setActive(false);
            } finally {
                requesting = false;
            }
        }

        document.addEventListener('visibilitychange', update);
        window.addEventListener('pageshow', update);
        void update();
        return () => {
            disposed = true;
            document.removeEventListener('visibilitychange', update);
            window.removeEventListener('pageshow', update);
            release();
        };
    }, [enabled, supported]);

    return { enabled, supported, active, setPreference };
}
