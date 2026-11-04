import type { ConsoleKey } from '../types';

interface RecentGame {
    gameId: string;
    launchedAt: number;
}

const LIMIT = 3;
const storageKey = (consoleKey: ConsoleKey) => `playroom.recent.${consoleKey}`;

export function getRecentGames(consoleKey: ConsoleKey): RecentGame[] {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(storageKey(consoleKey)) ?? '[]');
        if (!Array.isArray(value)) return [];
        return value.filter((entry): entry is RecentGame =>
            typeof entry?.gameId === 'string' && Number.isFinite(entry.launchedAt),
        ).slice(0, LIMIT);
    } catch {
        return [];
    }
}

export function recordGameLaunch(consoleKey: ConsoleKey, gameId: string) {
    const previous = getRecentGames(consoleKey).filter(entry => entry.gameId !== gameId);
    try {
        localStorage.setItem(storageKey(consoleKey), JSON.stringify(
            [{ gameId, launchedAt: Date.now() }, ...previous].slice(0, LIMIT),
        ));
    } catch {
        // Storage can be unavailable even when MiSTer accepted the launch.
    }
}
