import type { ConsoleKey, SaveSlot } from '../types';

const AUTH_KEY = 'mister_auth';
const HOST_KEY = 'mister_host';
const ROM_MAPPINGS_KEY = 'rom_mappings';
const SAVE_SLOTS_PREFIX = 'save_slots';

export const EMPTY_SLOTS: (SaveSlot | null)[] = [null, null, null, null];

export function readAuth(): { login: string; password: string } {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* corrupted */ }
    return { login: '', password: '' };
}

export function writeAuth(login: string, password: string): void {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ login, password }));
}

export function readHost(): string {
    return localStorage.getItem(HOST_KEY) || import.meta.env.VITE_WIZZO_ADDRESS || window.location.hostname;
}

export function writeHost(host: string): void {
    localStorage.setItem(HOST_KEY, host);
}

export function getRomMapping(ssGameId: number, consoleKey: ConsoleKey): string | null {
    try {
        const raw = localStorage.getItem(ROM_MAPPINGS_KEY);
        if (!raw) return null;
        const mappings: Record<string, string> = JSON.parse(raw);
        return mappings[`${ssGameId}_${consoleKey}`] ?? null;
    } catch {
        return null;
    }
}

export function setRomMapping(ssGameId: number, consoleKey: ConsoleKey, romPath: string): void {
    try {
        const raw = localStorage.getItem(ROM_MAPPINGS_KEY);
        const mappings: Record<string, string> = raw ? JSON.parse(raw) : {};
        mappings[`${ssGameId}_${consoleKey}`] = romPath;
        localStorage.setItem(ROM_MAPPINGS_KEY, JSON.stringify(mappings));
    } catch { /* localStorage full or unavailable */ }
}

export function getSaveSlots(gameId: number, consoleKey: ConsoleKey): (SaveSlot | null)[] {
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

export function putSaveSlot(gameId: number, consoleKey: ConsoleKey, slotIndex: number, slot: SaveSlot | null): (SaveSlot | null)[] {
    const slots = getSaveSlots(gameId, consoleKey);
    slots[slotIndex] = slot;
    try {
        localStorage.setItem(`${SAVE_SLOTS_PREFIX}_${gameId}_${consoleKey}`, JSON.stringify(slots));
    } catch { /* localStorage full */ }
    return slots;
}
