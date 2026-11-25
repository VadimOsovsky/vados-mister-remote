import type { ConsoleKey, LaunchBoxGame } from '../types';

const prefix = 'playroom.collection-games:';
const snapshots = new Map<ConsoleKey, LaunchBoxGame[]>();

export function readCollectionGameCache(consoleKey: ConsoleKey, ids: string[]) {
    let saved = snapshots.get(consoleKey);
    if (!saved) {
        try {
            const value: unknown = JSON.parse(localStorage.getItem(prefix + consoleKey) ?? '[]');
            saved = Array.isArray(value) ? value : [];
        } catch { saved = []; }
        snapshots.set(consoleKey, saved);
    }
    const owned = new Set(ids);
    return saved.filter(game => game && owned.has(game.id));
}

export function writeCollectionGameCache(consoleKey: ConsoleKey, games: LaunchBoxGame[]) {
    snapshots.set(consoleKey, games);
    try { localStorage.setItem(prefix + consoleKey, JSON.stringify(games)); }
    catch { /* Keep the cache in memory if storage is unavailable. */ }
}
