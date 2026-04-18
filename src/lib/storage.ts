import type { ConsoleKey, GameOverrides, SaveSlot } from '../types';

const HOST_KEY = 'mister_host';
const ROM_MAPPINGS_KEY = 'rom_mappings';
const SAVE_SLOTS_PREFIX = 'save_slots';
const GAME_OVERRIDES_PREFIX = 'game_overrides';

export const EMPTY_SLOTS: (SaveSlot | null)[] = [null, null, null, null];

export function readHost(): string {
    return localStorage.getItem(HOST_KEY) || import.meta.env.VITE_WIZZO_ADDRESS || window.location.hostname;
}

export function writeHost(host: string): void {
    localStorage.setItem(HOST_KEY, host);
}

export function getRomMapping(gameId: string, consoleKey: ConsoleKey): string | null {
    try {
        const raw = localStorage.getItem(ROM_MAPPINGS_KEY);
        if (!raw) return null;
        const mappings: Record<string, string> = JSON.parse(raw);
        return mappings[`${gameId}_${consoleKey}`] ?? null;
    } catch {
        return null;
    }
}

export function setRomMapping(gameId: string, consoleKey: ConsoleKey, romPath: string): void {
    try {
        const raw = localStorage.getItem(ROM_MAPPINGS_KEY);
        const mappings: Record<string, string> = raw ? JSON.parse(raw) : {};
        mappings[`${gameId}_${consoleKey}`] = romPath;
        localStorage.setItem(ROM_MAPPINGS_KEY, JSON.stringify(mappings));
    } catch { /* localStorage full or unavailable */ }
}

export function getSaveSlots(gameId: string | number, consoleKey: ConsoleKey): (SaveSlot | null)[] {
    try {
        const raw = localStorage.getItem(`${SAVE_SLOTS_PREFIX}_${gameId}_${consoleKey}`);
        if (!raw) return [...EMPTY_SLOTS];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [...EMPTY_SLOTS];
        return [parsed[0] ?? null, parsed[1] ?? null, parsed[2] ?? null, parsed[3] ?? null];
    } catch {
        return [...EMPTY_SLOTS];
    }
}

export function putSaveSlot(gameId: string | number, consoleKey: ConsoleKey, slotIndex: number, slot: SaveSlot | null): (SaveSlot | null)[] {
    const slots = getSaveSlots(gameId, consoleKey);
    slots[slotIndex] = slot;
    try {
        localStorage.setItem(`${SAVE_SLOTS_PREFIX}_${gameId}_${consoleKey}`, JSON.stringify(slots));
    } catch { /* localStorage full */ }
    return slots;
}

// ── Game overrides ──

export function getGameOverrides(gameId: string, consoleKey: ConsoleKey): GameOverrides {
    try {
        const raw = localStorage.getItem(`${GAME_OVERRIDES_PREFIX}_${gameId}_${consoleKey}`);
        if (raw) return JSON.parse(raw);
    } catch { /* corrupted */ }
    return {};
}

export function setGameOverrides(gameId: string, consoleKey: ConsoleKey, overrides: GameOverrides): void {
    try {
        localStorage.setItem(`${GAME_OVERRIDES_PREFIX}_${gameId}_${consoleKey}`, JSON.stringify(overrides));
    } catch { /* localStorage full */ }
}
