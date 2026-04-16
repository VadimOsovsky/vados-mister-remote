/**
 * ScreenScraper game data service.
 * Replaces the old LaunchBox service.
 *
 * Two-tier caching: memory → IndexedDB → network (static JSON or API).
 */
import type { ConsoleKey, SSGame, SSMedia } from '../types';
import { PLATFORMS } from '../constants';
import { ScreenScraperApi, SSApiError } from './screenscraper-api';

const DB_NAME = 'screenscraper-cache';
const DB_VERSION = 2;
const STORE_COLLECTIONS = 'collections';
const STORE_GAMES = 'games';

const THUMB_PROXY = 'https://wsrv.nl';
const THUMB_WIDTH = 200;

// ── Singleton API instance ──

let api: ScreenScraperApi | null = null;

export function initApi(devId: string, devPassword: string): void {
  api = new ScreenScraperApi(devId, devPassword);
  // Restore user credentials from localStorage
  const ssId = localStorage.getItem('ss_user');
  const ssPass = localStorage.getItem('ss_pass');
  if (ssId && ssPass) {
    api.setUserCredentials(ssId, ssPass);
  }
}

export function setUserCredentials(ssId: string, ssPassword: string): void {
  localStorage.setItem('ss_user', ssId);
  localStorage.setItem('ss_pass', ssPassword);
  api?.setUserCredentials(ssId, ssPassword);
}

export function clearUserCredentials(): void {
  localStorage.removeItem('ss_user');
  localStorage.removeItem('ss_pass');
  api?.clearUserCredentials();
}

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
        db.createObjectStore(STORE_COLLECTIONS);
      }
      if (!db.objectStoreNames.contains(STORE_GAMES)) {
        db.createObjectStore(STORE_GAMES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(store: string, key: IDBValidKey): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store: string, key: IDBValidKey, data: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── In-memory cache ──
const memoryCache = new Map<number, SSGame[]>();

// ── Public API ──

/**
 * Load collection games for a console variant.
 * For each game ID in the collection: memory → IndexedDB → API fetch.
 */
export async function loadCollectionGames(consoleKey: ConsoleKey): Promise<SSGame[]> {
  const platform = PLATFORMS[consoleKey];
  const gameIds = platform.collection;
  if (gameIds.length === 0) return [];

  const results: SSGame[] = [];

  for (const id of gameIds) {
    // Memory cache (scan all loaded games)
    let game: SSGame | undefined;
    for (const games of memoryCache.values()) {
      game = games.find(g => g.id === id);
      if (game) break;
    }

    // IndexedDB
    if (!game) {
      try {
        game = (await idbGet<SSGame>(STORE_GAMES, id)) ?? undefined;
      } catch { /* */ }
    }

    // API fetch
    if (!game && api) {
      try {
        game = await api.getGame(id, platform.ssSystemId);
        idbPut(STORE_GAMES, game.id, game).catch(() => {});
      } catch (err) {
        console.warn(`Failed to fetch game ${id}:`, err);
      }
    }

    if (game) {
      // Update memory cache
      const cached = memoryCache.get(platform.ssSystemId) ?? [];
      if (!cached.some(g => g.id === game!.id)) {
        cached.push(game);
        memoryCache.set(platform.ssSystemId, cached);
      }
      results.push(game);
    }
  }

  return results;
}

/**
 * Search games via ScreenScraper API.
 * Results are cached individually in IndexedDB.
 */
export async function searchGames(query: string, consoleKey: ConsoleKey): Promise<SSGame[]> {
  if (!api) return [];
  const systemId = PLATFORMS[consoleKey].ssSystemId;

  try {
    const results = await api.searchGames(query, systemId);
    // Cache each game individually
    for (const game of results) {
      idbPut(STORE_GAMES, game.id, game).catch(() => {});
    }
    return results;
  } catch (err) {
    if (err instanceof SSApiError) {
      console.warn(`ScreenScraper search failed: ${err.message}`);
    }
    return [];
  }
}

/**
 * Get a single game by SS ID (with cache).
 */
export async function getGameById(gameId: number): Promise<SSGame | null> {
  // Check memory — scan collections
  for (const games of memoryCache.values()) {
    const found = games.find(g => g.id === gameId);
    if (found) return found;
  }

  // Check IndexedDB individual games store
  try {
    const cached = await idbGet<SSGame>(STORE_GAMES, gameId);
    if (cached) return cached;
  } catch { /* */ }

  // Fetch from API
  if (!api) return null;
  try {
    const game = await api.getGame(gameId);
    idbPut(STORE_GAMES, game.id, game).catch(() => {});
    return game;
  } catch {
    return null;
  }
}

// ── Media rotation patches ──
// Some box art (e.g. Famicom) comes rotated from ScreenScraper.
// Key format: "gameId:mediaType:region" or "gameId:mediaType" (any region).
const MEDIA_ROTATION: Record<string, number> = {
  '1245:box-2D:jp': 90,
  '1245:box-2D-back:jp': 270,
};

/**
 * Get rotation in degrees for a specific game's media, or 0 if none.
 */
export function getMediaRotation(gameId: number, mediaType: string, region: string): number {
  return MEDIA_ROTATION[`${gameId}:${mediaType}:${region}`]
    ?? MEDIA_ROTATION[`${gameId}:${mediaType}`]
    ?? 0;
}

interface ResolvedMedia {
  url: string;
  region: string;
  rotation: number;
}

/**
 * Resolve the best media for a game given preferred regions and media type.
 * Returns undefined if no matching media found.
 */
export function resolveMedia(
  game: SSGame,
  regions: string[],
  type: string,
): ResolvedMedia | undefined {
  const candidates = game.medias.filter(m => m.type === type);
  if (candidates.length === 0) return undefined;

  let match: SSMedia | undefined;

  // Try preferred regions in order
  for (const region of regions) {
    match = candidates.find(m => m.region === region);
    if (match) break;
  }

  // Fallback: 'wor', 'ss', then first available
  if (!match) {
    for (const fallback of ['wor', 'ss']) {
      match = candidates.find(m => m.region === fallback);
      if (match) break;
    }
  }

  if (!match) match = candidates[0];
  if (!match) return undefined;

  return {
    url: match.url,
    region: match.region,
    rotation: getMediaRotation(game.id, type, match.region),
  };
}

/** Shorthand: resolve just the URL (backward compat). */
export function resolveMediaUrl(
  game: SSGame,
  regions: string[],
  type: string,
): string | undefined {
  return resolveMedia(game, regions, type)?.url;
}

/**
 * Get thumbnail URL via wsrv.nl proxy (resize + webp).
 */
export function getThumbUrl(mediaUrl: string, width = THUMB_WIDTH): string {
  return `${THUMB_PROXY}/?url=${encodeURIComponent(mediaUrl)}&w=${width}&fit=contain&output=webp`;
}

interface ThumbResult {
  src: string;
  rotation: number;
}

/**
 * Resolve front box art as a thumbnail URL + rotation.
 */
export function resolveFrontThumb(game: SSGame, regions: string[]): ThumbResult | undefined {
  const m = resolveMedia(game, regions, 'box-2D');
  return m ? { src: getThumbUrl(m.url), rotation: m.rotation } : undefined;
}

/**
 * Resolve back box art as a thumbnail URL + rotation.
 */
export function resolveBackThumb(game: SSGame, regions: string[]): ThumbResult | undefined {
  const m = resolveMedia(game, regions, 'box-2D-back');
  return m ? { src: getThumbUrl(m.url), rotation: m.rotation } : undefined;
}

/**
 * Resolve cartridge (support-2D) as a thumbnail URL + rotation.
 */
export function resolveCartridgeThumb(game: SSGame, regions: string[]): ThumbResult | undefined {
  const m = resolveMedia(game, regions, 'support-2D');
  return m ? { src: getThumbUrl(m.url), rotation: m.rotation } : undefined;
}

/**
 * Resolve manual (PDF) URL. Returns the direct URL (no thumbnail proxy).
 */
export function resolveManualUrl(game: SSGame, regions: string[]): string | undefined {
  return resolveMedia(game, regions, 'manuel')?.url;
}

/**
 * Search within already-loaded games (local/offline search).
 */
export function searchLocal(games: SSGame[], query: string): SSGame[] {
  const q = query.toLowerCase();
  return games.filter(
    g => g.name.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q),
  );
}

/**
 * Build an array of gallery slides (full-res image URLs) for a game.
 */
export function buildGallerySlides(
  game: SSGame,
  regions: string[],
): { src: string }[] {
  const slides: { src: string }[] = [];
  const front = resolveMediaUrl(game, regions, 'box-2D');
  if (front) slides.push({ src: front });
  const back = resolveMediaUrl(game, regions, 'box-2D-back');
  if (back) slides.push({ src: back });
  const cartridge = resolveMediaUrl(game, regions, 'support-2D');
  if (cartridge) slides.push({ src: cartridge });
  const screenshot = resolveMediaUrl(game, regions, 'screenshot');
  if (screenshot) slides.push({ src: screenshot });
  return slides;
}

/**
 * Clear all caches.
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear();
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_COLLECTIONS, STORE_GAMES], 'readwrite');
    tx.objectStore(STORE_COLLECTIONS).clear();
    tx.objectStore(STORE_GAMES).clear();
  } catch {
    // ignore
  }
}

// Re-export for convenience
export type { SSMedia };
