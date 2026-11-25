type Values = Record<string, string>;
type Snapshot = { revision: number; values: Values };
type SyncStatus = 'saved' | 'saving' | 'offline' | 'conflict';

const apiOrigin = import.meta.env?.VITE_PLAYROOM_API_ORIGIN?.trim().replace(/\/+$/, '') ?? '';
const endpoint = `${apiOrigin}/api/playroom/state`;
let sharedEnabled = import.meta.env?.PROD && (import.meta.env.BASE_URL === '/' || Boolean(apiOrigin));
const cacheKey = `playroom.snapshot:${endpoint}`;
const sharedKey = /^(?:store_free_games|rom_mappings|active_console|owned_consoles|store_sort|wallet_balance|wallet_last_topup|wallet_beaten_rewarded|owned_game_tab|(?:save_slots|game_rom_versions|game_overrides|game_cheats|game_screenshots|collection|favorites|beaten|custom_games)_.+|playroom\.recent\..+)$/;

let confirmed: Snapshot | undefined;
let values: Values = {};
let status: SyncStatus = 'saved';
let syncing = false;
let online = false;
let fresh = false;
let cached: Snapshot | null | undefined;
const valueListeners = new Set<() => void>();
let batchDepth = 0;
let changed = false;

export function subscribeToValues(listener: () => void) {
    valueListeners.add(listener);
    return () => { valueListeners.delete(listener); };
}

function publishValues() {
    valueListeners.forEach(listener => listener());
}

function flushChanges() {
    if (batchDepth || !changed) return;
    changed = false;
    publishValues();
    void syncSharedStorage();
}

export function batchStorageWrites<T>(write: () => T): T {
    batchDepth++;
    try {
        return write();
    } finally {
        batchDepth--;
        flushChanges();
    }
}

function valuesChanged() {
    changed = true;
    flushChanges();
}

const listeners = new Set<() => void>();

export function subscribeToSync(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export const getSyncStatus = () => status;
export const isSharedStorageReady = () => !sharedEnabled || (online && fresh && status !== 'offline');
export const hasSharedSnapshot = () => Boolean(confirmed ?? readCache());

function readCache() {
    if (!sharedEnabled) return null;
    if (cached === undefined) {
        try {
            const snapshot = JSON.parse(localStorage.getItem(cacheKey) ?? 'null') as Snapshot | null;
            cached = snapshot && Number.isInteger(snapshot.revision) && snapshot.values ? snapshot : null;
        } catch { cached = null; }
    }
    return cached;
}

function cacheSnapshot(snapshot: Snapshot) {
    cached = snapshot;
    try { localStorage.setItem(cacheKey, JSON.stringify(snapshot)); }
    catch { /* The current snapshot remains available in memory. */ }
}

export function setSharedStorageOnline(available: boolean) {
    if (online === available) return;
    online = available;
    if (!available) fresh = false;
    report(status);
    publishValues();
}

function report(next: SyncStatus) {
    status = next;
    listeners.forEach(listener => listener());
}

async function fetchState() {
    const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('Could not read shared data');
    return await response.json() as Snapshot;
}

function writeState(snapshot: Snapshot) {
    return fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
        signal: AbortSignal.timeout(8000),
    });
}

export async function initializeSharedStorage() {
    // Standalone consumers can opt into same-origin syncing explicitly.
    if (!import.meta.env) {
        sharedEnabled = true;
        online = true;
    }
    if (!sharedEnabled || !online) return;
    let snapshot = await fetchState();
    if (snapshot.revision === 0) {
        const legacy: Values = {};
        for (const key of Object.keys(localStorage)) {
            const value = localStorage.getItem(key);
            if (sharedKey.test(key) && value !== null) legacy[key] = value;
        }
        if (online && Object.keys(legacy).length) {
            const response = await writeState({ revision: 0, values: legacy });
            if (response.status === 409) snapshot = await fetchState();
            else if (response.ok) snapshot = await response.json() as Snapshot;
            else throw new Error('Could not import local data');
        }
    }
    confirmed = snapshot;
    values = snapshot.values;
    cacheSnapshot(snapshot);
    fresh = online;
    publishValues();
}

export async function syncSharedStorage(refresh = false) {
    if (!sharedEnabled || !online || syncing || status === 'conflict') return;
    const clean = fresh && confirmed?.values === values && status === 'saved';
    if (clean && !refresh) return;
    const wasFresh = fresh;
    syncing = true;
    if (!clean) report('saving');
    try {
        if (!confirmed || (!fresh && confirmed.values === values)) await initializeSharedStorage();
        else if (clean) {
            const latest = await fetchState();
            // Writes made during this GET still use their original revision for conflict resolution.
            if (online && confirmed.values === values && latest.revision !== confirmed.revision) {
                confirmed = latest;
                values = latest.values;
                cacheSnapshot(latest);
                publishValues();
            }
        }
        if (online && confirmed?.values !== values) report('saving');
        while (online && confirmed && confirmed.values !== values) {
            const sent = values;
            const response = await writeState({ revision: confirmed.revision, values: sent });
            if (response.status === 409) {
                const latest = await fetchState();
                const base = confirmed.values;
                const merged = { ...latest.values };
                for (const key of new Set([...Object.keys(base), ...Object.keys(values)])) {
                    const value = values[key];
                    if (value === base[key]) continue;
                    if (latest.values[key] !== base[key] && latest.values[key] !== value) {
                        report('conflict');
                        return;
                    }
                    if (value === undefined) delete merged[key];
                    else merged[key] = value;
                }
                confirmed = latest;
                values = merged;
                publishValues();
                continue;
            }
            if (!response.ok) throw new Error('Could not save shared data');
            confirmed = await response.json() as Snapshot;
            cacheSnapshot(confirmed);
            if (sent === values) values = confirmed.values;
        }
        fresh = online;
        report('saved');
        if (!wasFresh) publishValues();
    } catch {
        fresh = false;
        report('offline');
        publishValues();
    } finally {
        syncing = false;
    }
}

export const appStorage = {
    keys() {
        if (confirmed) return Object.keys(online && fresh ? values : confirmed.values);
        const snapshot = readCache();
        return snapshot ? Object.keys(snapshot.values) : Object.keys(localStorage);
    },
    getItem(key: string) {
        if (confirmed) return (online && fresh ? values : confirmed.values)[key] ?? null;
        const snapshot = readCache();
        return snapshot ? snapshot.values[key] ?? null : localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
        if (!isSharedStorageReady()) return;
        if (!confirmed) {
            if (localStorage.getItem(key) === value) return;
            localStorage.setItem(key, value);
            valuesChanged();
            return;
        }
        if (values[key] === value) return;
        values = { ...values, [key]: value };
        valuesChanged();
    },
    removeItem(key: string) {
        if (!isSharedStorageReady()) return;
        if (!confirmed) {
            if (localStorage.getItem(key) === null) return;
            localStorage.removeItem(key);
            valuesChanged();
            return;
        }
        if (!Object.hasOwn(values, key)) return;
        values = { ...values };
        delete values[key];
        valuesChanged();
    },
};
