import type { ConsoleKey, GameOverrides, LaunchBoxGame, SaveSlot, SortMode } from '../types';
import { PLATFORMS } from '../constants';

const HOST_KEY = 'mister_host';
const ROM_MAPPINGS_KEY = 'rom_mappings';
const SAVE_SLOTS_PREFIX = 'save_slots';
const GAME_OVERRIDES_PREFIX = 'game_overrides';
const COLLECTION_PREFIX = 'collection';
const BEATEN_PREFIX = 'beaten';
const ACTIVE_CONSOLE_KEY = 'active_console';
const CUSTOM_GAMES_PREFIX = 'custom_games';
const STORE_SORT_KEY = 'store_sort';

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

export function getSaveSlots(gameId: string | number): (SaveSlot | null)[] {
    try {
        const raw = localStorage.getItem(`${SAVE_SLOTS_PREFIX}_${gameId}`);
        if (!raw) return [...EMPTY_SLOTS];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [...EMPTY_SLOTS];
        return [parsed[0] ?? null, parsed[1] ?? null, parsed[2] ?? null, parsed[3] ?? null];
    } catch {
        return [...EMPTY_SLOTS];
    }
}

export function putSaveSlot(gameId: string | number, slotIndex: number, slot: SaveSlot | null): (SaveSlot | null)[] {
    const slots = getSaveSlots(gameId);
    slots[slotIndex] = slot;
    try {
        localStorage.setItem(`${SAVE_SLOTS_PREFIX}_${gameId}`, JSON.stringify(slots));
    } catch { /* localStorage full */ }
    return slots;
}

export function deleteSaveSlot(gameId: string | number, slotIndex: number): (SaveSlot | null)[] {
    return putSaveSlot(gameId, slotIndex, null);
}

// ── Game overrides ──

export function getGameOverrides(gameId: string, consoleKey: ConsoleKey): GameOverrides {
    try {
        const raw = localStorage.getItem(`${GAME_OVERRIDES_PREFIX}_${gameId}_${collectionKey(consoleKey)}`);
        if (raw) return JSON.parse(raw);
    } catch { /* corrupted */ }
    return {};
}

export function setGameOverrides(gameId: string, consoleKey: ConsoleKey, overrides: GameOverrides): void {
    try {
        localStorage.setItem(`${GAME_OVERRIDES_PREFIX}_${gameId}_${collectionKey(consoleKey)}`, JSON.stringify(overrides));
    } catch { /* localStorage full */ }
}

export function deleteGameOverrides(gameId: string, consoleKey: ConsoleKey): void {
    try {
        localStorage.removeItem(`${GAME_OVERRIDES_PREFIX}_${gameId}_${collectionKey(consoleKey)}`);
    } catch { /* ignore */ }
}

// ── Collection ──

function collectionKey(consoleKey: ConsoleKey): ConsoleKey {
    return PLATFORMS[consoleKey].collectionGroup ?? consoleKey;
}

export function getCollectionIds(consoleKey: ConsoleKey): string[] {
    try {
        const raw = localStorage.getItem(`${COLLECTION_PREFIX}_${collectionKey(consoleKey)}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function addCollectionId(consoleKey: ConsoleKey, gameId: string): string[] {
    const key = collectionKey(consoleKey);
    const ids = getCollectionIds(key);
    if (!ids.includes(gameId)) ids.push(gameId);
    try {
        localStorage.setItem(`${COLLECTION_PREFIX}_${key}`, JSON.stringify(ids));
    } catch { /* localStorage full */ }
    return ids;
}

export function removeCollectionId(consoleKey: ConsoleKey, gameId: string): string[] {
    const key = collectionKey(consoleKey);
    const ids = getCollectionIds(key).filter(id => id !== gameId);
    try {
        localStorage.setItem(`${COLLECTION_PREFIX}_${key}`, JSON.stringify(ids));
    } catch { /* localStorage full */ }
    return ids;
}

// ── Beaten games ──

export function getBeatenIds(consoleKey: ConsoleKey): string[] {
    try {
        const raw = localStorage.getItem(`${BEATEN_PREFIX}_${collectionKey(consoleKey)}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function addBeatenId(consoleKey: ConsoleKey, gameId: string): string[] {
    const key = collectionKey(consoleKey);
    const ids = getBeatenIds(key);
    if (!ids.includes(gameId)) ids.push(gameId);
    try {
        localStorage.setItem(`${BEATEN_PREFIX}_${key}`, JSON.stringify(ids));
    } catch { /* localStorage full */ }
    return ids;
}

export function removeBeatenId(consoleKey: ConsoleKey, gameId: string): string[] {
    const key = collectionKey(consoleKey);
    const ids = getBeatenIds(key).filter(id => id !== gameId);
    try {
        localStorage.setItem(`${BEATEN_PREFIX}_${key}`, JSON.stringify(ids));
    } catch { /* localStorage full */ }
    return ids;
}

// ── Custom games ──

export function getCustomGames(consoleKey: ConsoleKey): LaunchBoxGame[] {
    try {
        const raw = localStorage.getItem(`${CUSTOM_GAMES_PREFIX}_${collectionKey(consoleKey)}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function addCustomGame(consoleKey: ConsoleKey, game: LaunchBoxGame): void {
    const key = collectionKey(consoleKey);
    const games = getCustomGames(key as ConsoleKey);
    if (!games.some(g => g.id === game.id)) games.push(game);
    try {
        localStorage.setItem(`${CUSTOM_GAMES_PREFIX}_${key}`, JSON.stringify(games));
    } catch { /* localStorage full */ }
}

export function removeCustomGame(consoleKey: ConsoleKey, gameId: string): void {
    const key = collectionKey(consoleKey);
    const games = getCustomGames(key as ConsoleKey).filter(g => g.id !== gameId);
    try {
        localStorage.setItem(`${CUSTOM_GAMES_PREFIX}_${key}`, JSON.stringify(games));
    } catch { /* localStorage full */ }
}

// ── Active console ──

export function readActiveConsole(): ConsoleKey | null {
    const val = localStorage.getItem(ACTIVE_CONSOLE_KEY);
    return val && val in PLATFORMS ? val as ConsoleKey : null;
}

export function writeActiveConsole(key: ConsoleKey): void {
    localStorage.setItem(ACTIVE_CONSOLE_KEY, key);
}

// ── Store sort ──

const VALID_SORT_MODES: Set<string> = new Set(['az', 'za', 'recent', 'most', 'popular', 'year', 'title']);

export function readStoreSort(): SortMode | null {
    const val = localStorage.getItem(STORE_SORT_KEY);
    return val && VALID_SORT_MODES.has(val) ? val as SortMode : null;
}

export function writeStoreSort(sort: SortMode): void {
    localStorage.setItem(STORE_SORT_KEY, sort);
}
