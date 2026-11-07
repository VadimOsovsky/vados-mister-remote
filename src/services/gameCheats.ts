import { appStorage } from '../lib/sharedStorage';
import type { ConsoleKey } from '../types';

const endpoint = '/api/playroom/cheats';
export const NES_CHEAT_LIMIT = 32;
export type CheatCatalog = { supported: boolean; revision: string; entries: { id: string; codes: number }[] };

export class CheatLaunchError extends Error {}

function selectionKey(consoleKey: ConsoleKey, rom: string) {
    return `game_cheats_${consoleKey}:${rom}`;
}

export function readCheatSelection(consoleKey: ConsoleKey, rom: string): string[] {
    try {
        const names: unknown = JSON.parse(appStorage.getItem(selectionKey(consoleKey, rom)) ?? '[]');
        if (Array.isArray(names)) return names.filter((name): name is string => typeof name === 'string');
    } catch { /* invalid stored selection */ }
    return [];
}

export function saveCheatSelection(consoleKey: ConsoleKey, rom: string, names: string[]) {
    const key = selectionKey(consoleKey, rom);
    if (names.length) appStorage.setItem(key, JSON.stringify(names));
    else appStorage.removeItem(key);
}

export async function fetchCheats(rom: string, signal?: AbortSignal): Promise<CheatCatalog> {
    const response = await fetch(`${endpoint}?${new URLSearchParams({ rom })}`, { signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Cheats are unavailable from the Playroom server.');
    }
    return response.json();
}

export async function applyLaunchCheats(rom: string, names: string[], previous: string) {
    for (let attempt = 0; attempt < 30; attempt++) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rom, names, previous }),
        });
        if (response.ok) return;
        if (response.status !== 425) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error ?? 'MiSTer could not receive the selected cheats.');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('MiSTer did not report the selected ROM as active.');
}
