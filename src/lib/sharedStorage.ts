import { DAILY_ALLOWANCE, normalizeVisitDate, STARTING_BALANCE } from './walletVisit';

type Values = Record<string, string>;
type Snapshot = { revision: number; values: Values };
type SyncStatus = 'saved' | 'saving' | 'offline' | 'conflict';

const apiOrigin = import.meta.env?.VITE_PLAYROOM_API_ORIGIN?.trim().replace(/\/+$/, '') ?? '';
const endpoint = `${apiOrigin}/api/playroom/state`;
let sharedEnabled = import.meta.env?.PROD && (import.meta.env.BASE_URL === '/' || Boolean(apiOrigin));
const cacheKey = `playroom.snapshot:${endpoint}`;
const walletVisitPrefix = cacheKey + ':wallet-visit:';
const sharedKey = /^(?:store_free_games|rom_mappings|active_console|owned_consoles|wallet_balance|wallet_last_topup|wallet_allowance_since|wallet_visit_\d{4}-\d{2}-\d{2}|wallet_beaten_rewarded|owned_game_tab|(?:save_slots|game_rom_versions|game_overrides|game_cheats|game_screenshots|collection|favorites|beaten|custom_games)_.+|playroom\.recent\..+)$/;

let confirmed: Snapshot | undefined;
let values: Values = {};
let status: SyncStatus = 'saved';
let syncing = false;
let online = false;
let fresh = false;
let cached: Snapshot | null | undefined;
let walletVisitDates: string[] | undefined;
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
export const isSharedStorageReady = () => !sharedEnabled || (online && fresh && status !== 'offline' && !pendingWalletVisits().length);
export const hasSharedSnapshot = () => Boolean(confirmed ?? readCache());

export async function confirmSharedStorageWrites(): Promise<boolean> {
    if (!sharedEnabled) return true;
    await syncSharedStorage(true);
    if (status === 'saving') {
        await new Promise<void>(resolve => {
            const unsubscribe = subscribeToSync(() => {
                if (status === 'saving') return;
                unsubscribe();
                resolve();
            });
        });
    }
    return isSharedStorageReady() && status === 'saved' && confirmed?.values === values;
}

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

export function handleSharedStorageChange(key: string | null) {
    if (!sharedEnabled || (key !== null && key !== cacheKey && !key.startsWith(walletVisitPrefix))) return;
    cached = undefined;
    walletVisitDates = undefined;
    publishValues();
    report(status);
    void syncSharedStorage(key === cacheKey);
}

function pendingWalletVisits(): string[] {
    if (walletVisitDates) return walletVisitDates;
    try {
        walletVisitDates = Object.keys(localStorage)
            .filter(key => key.startsWith(walletVisitPrefix))
            .map(key => key.slice(walletVisitPrefix.length))
            .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
            .sort();
        return walletVisitDates;
    } catch { return []; }
}

function applyWalletVisits(base: Values, dates: string[]): Values {
    if (!dates.length || base.store_free_games === 'true') return base;
    const last = base.wallet_last_topup;
    // Older snapshots only record the last paid date. Treat it as the migration cutoff.
    const since = base.wallet_allowance_since ?? (last ? normalizeVisitDate(last) : dates[0]);
    let next = base;
    if (!last) {
        next = { ...base, wallet_balance: String(STARTING_BALANCE), wallet_last_topup: since, wallet_allowance_since: since };
    }
    for (const date of dates) {
        const key = 'wallet_visit_' + date;
        if (date <= since || next[key]) continue;
        if (next === base) next = { ...base };
        next[key] = 'true';
        next.wallet_allowance_since = since;
        next.wallet_balance = String(Math.round((Number(next.wallet_balance ?? 0) + DAILY_ALLOWANCE) * 100) / 100);
        const lastDay = normalizeVisitDate(next.wallet_last_topup);
        next.wallet_last_topup = date > lastDay ? date : lastDay;
    }
    return next;
}

export function queueWalletVisit(date: string): { balance: number; reward: number } | undefined {
    if (!sharedEnabled) return undefined;
    const before = Number(appStorage.getItem('wallet_balance') ?? 0);
    const last = appStorage.getItem('wallet_last_topup');
    if (appStorage.getItem('store_free_games') === 'true' || (last && date <= normalizeVisitDate(last))) {
        return { balance: before, reward: 0 };
    }
    try { localStorage.setItem(walletVisitPrefix + date, '1'); }
    catch { return { balance: before, reward: 0 }; }
    walletVisitDates = undefined;
    const balance = Number(appStorage.getItem('wallet_balance') ?? 0);
    valuesChanged();
    return { balance, reward: last ? DAILY_ALLOWANCE : 0 };
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
    if (clean && !refresh && !pendingWalletVisits().length) return;
    const wasFresh = fresh;
    syncing = true;
    if (!clean || pendingWalletVisits().length) report('saving');
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
        if (online && (confirmed?.values !== values || pendingWalletVisits().length)) report('saving');
        while (online && confirmed && confirmed.values !== values) {
            const sent = values;
            const response = await writeState({ revision: confirmed.revision, values: sent });
            if (response.status === 409) {
                const latest = await fetchState();
                const base = confirmed.values;
                const merged = { ...latest.values };
                const sameWalletChange = values.wallet_balance !== base.wallet_balance &&
                    values.wallet_balance === latest.values.wallet_balance;
                for (const key of new Set([...Object.keys(base), ...Object.keys(values)])) {
                    const value = values[key];
                    if (value === base[key]) continue;
                    const ownershipChanged = key === 'owned_consoles' || key.startsWith('collection_');
                    // Two different transactions can produce the same wallet balance.
                    if (latest.values[key] !== value && (latest.values[key] !== base[key] || (sameWalletChange && ownershipChanged))) {
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
        while (online && confirmed) {
            const dates = pendingWalletVisits();
            if (!dates.length) break;
            const next = applyWalletVisits(confirmed.values, dates);
            if (next !== confirmed.values) {
                const response = await writeState({ revision: confirmed.revision, values: next });
                if (response.status === 409) {
                    confirmed = await fetchState();
                    values = confirmed.values;
                    cacheSnapshot(confirmed);
                    continue;
                }
                if (!response.ok) throw new Error('Could not save wallet visits');
                confirmed = await response.json() as Snapshot;
                values = confirmed.values;
                cacheSnapshot(confirmed);
            }
            for (const date of dates) localStorage.removeItem(walletVisitPrefix + date);
            walletVisitDates = undefined;
            publishValues();
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
        return Object.keys((online && fresh && confirmed ? values : (readCache() ?? confirmed)?.values) ?? localStorage);
    },
    getItem(key: string) {
        const base = online && fresh && confirmed ? values : (readCache() ?? confirmed)?.values;
        const value = base ? base[key] ?? null : localStorage.getItem(key);
        if (!sharedEnabled || (key !== 'wallet_balance' && key !== 'wallet_last_topup')) return value;
        const dates = pendingWalletVisits();
        if (!dates.length) return value;
        const wallet = base ?? {
            wallet_balance: localStorage.getItem('wallet_balance') ?? '0',
            wallet_last_topup: localStorage.getItem('wallet_last_topup') ?? '',
            store_free_games: localStorage.getItem('store_free_games') ?? '',
        };
        const projected = applyWalletVisits(wallet, dates);
        return projected === wallet ? value : projected[key] ?? null;
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
