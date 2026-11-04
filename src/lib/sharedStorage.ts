type Values = Record<string, string>;
type Snapshot = { revision: number; values: Values };
type SyncStatus = 'saved' | 'saving' | 'offline' | 'conflict';

const endpoint = '/api/playroom/state';
const sharedKey = /^(?:store_free_games|rom_mappings|active_console|store_sort|wallet_balance|wallet_last_topup|wallet_beaten_rewarded|owned_game_tab|(?:save_slots|game_overrides|collection|favorites|beaten|custom_games)_.+|playroom\.recent\..+)$/;

let confirmed: Snapshot | undefined;
let values: Values = {};
let status: SyncStatus = 'saved';
let syncing = false;
const listeners = new Set<() => void>();

export function subscribeToSync(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export const getSyncStatus = () => status;

function report(next: SyncStatus) {
    status = next;
    listeners.forEach(listener => listener());
}

async function fetchState() {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not read shared data');
    return await response.json() as Snapshot;
}

function writeState(snapshot: Snapshot) {
    return fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
    });
}

export async function initializeSharedStorage() {
    if (import.meta.env.DEV) return;

    let snapshot = await fetchState();
    if (snapshot.revision === 0) {
        const legacy: Values = {};
        for (const key of Object.keys(localStorage)) {
            const value = localStorage.getItem(key);
            if (sharedKey.test(key) && value !== null) legacy[key] = value;
        }
        if (Object.keys(legacy).length) {
            const response = await writeState({ revision: 0, values: legacy });
            if (response.status === 409) snapshot = await fetchState();
            else if (response.ok) snapshot = await response.json() as Snapshot;
            else throw new Error('Could not import local data');
        }
    }
    confirmed = snapshot;
    values = { ...snapshot.values };
}

export async function syncSharedStorage() {
    if (!confirmed || syncing || status === 'conflict') return;
    syncing = true;
    report('saving');
    try {
        while (true) {
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
                continue;
            }
            if (!response.ok) throw new Error('Could not save shared data');
            confirmed = await response.json() as Snapshot;
            if (sent === values) break;
        }
        report('saved');
    } catch {
        report('offline');
    } finally {
        syncing = false;
    }
}

export const appStorage = {
    getItem(key: string) {
        return confirmed ? values[key] ?? null : localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
        if (!confirmed) {
            localStorage.setItem(key, value);
            return;
        }
        if (values[key] === value) return;
        values = { ...values, [key]: value };
        void syncSharedStorage();
    },
    removeItem(key: string) {
        if (!confirmed) {
            localStorage.removeItem(key);
            return;
        }
        if (!Object.hasOwn(values, key)) return;
        values = { ...values };
        delete values[key];
        void syncSharedStorage();
    },
};
