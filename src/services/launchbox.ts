import type { ConsoleKey, LaunchBoxGame, LaunchBoxImages } from '../types';
import { PLATFORMS } from '../constants';

const IMAGE_CDN = 'https://images.launchbox-app.com';
const DB_NAME = 'launchbox-cache';
const DB_VERSION = 4;
const STORE_NAME = 'platforms';

// ── IndexedDB helpers ──
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCached(key: string): Promise<LaunchBoxGame[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function setCache(key: string, data: LaunchBoxGame[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── In-memory cache ──
const memoryCache = new Map<string, LaunchBoxGame[]>();

// ── Public API ──

export function getImageUrl(fileName: string, width?: number): string {
  const url = `${IMAGE_CDN}/${fileName}`;
  if (width) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;
  }
  return url;
}

/**
 * Resolve display title for a game given preferred name regions.
 * Returns the first matching region's alternate name, or the default title.
 */
export function resolveTitle(
  game: LaunchBoxGame,
  nameRegions?: string[],
): string {
  if (nameRegions && game.alternateNames) {
    for (const region of nameRegions) {
      if (game.alternateNames[region]) {
        return game.alternateNames[region];
      }
    }
  }
  return game.title;
}

/**
 * Resolve best image for a game given preferred regions.
 * Returns the first matching region's images, or the first available region.
 */
export function resolveImages(
  game: LaunchBoxGame,
  preferredRegions: string[],
): LaunchBoxImages {
  // Try preferred regions in order
  for (const region of preferredRegions) {
    if (game.images[region]?.front) {
      return game.images[region];
    }
  }
  // Fallback: first region that has a front image
  for (const regionImages of Object.values(game.images)) {
    if (regionImages.front) return regionImages;
  }
  return {};
}

/**
 * Load all games for a LaunchBox platform (e.g. 'nes', 'snes').
 * Multiple ConsoleKeys may share the same lbPlatform.
 */
export async function loadPlatformGames(consoleKey: ConsoleKey): Promise<LaunchBoxGame[]> {
  const platform = PLATFORMS[consoleKey].lbPlatform;

  // Check memory cache
  if (memoryCache.has(platform)) {
    return memoryCache.get(platform)!;
  }

  // Check IndexedDB cache
  try {
    const cached = await getCached(platform);
    if (cached) {
      memoryCache.set(platform, cached);
      return cached;
    }
  } catch {
    // IndexedDB not available, proceed to fetch
  }

  // Fetch from static JSON
  const res = await fetch(`/launchbox/${platform}.json`);
  if (!res.ok) {
    console.warn(`LaunchBox data for ${platform} not found`);
    return [];
  }

  const games: LaunchBoxGame[] = await res.json();
  memoryCache.set(platform, games);

  // Cache in IndexedDB (fire and forget)
  setCache(platform, games).catch(() => {});

  return games;
}

/**
 * Load only the collection games for a specific console variant.
 */
export async function loadCollectionGames(consoleKey: ConsoleKey, collectionIds: string[]): Promise<LaunchBoxGame[]> {
  const allGames = await loadPlatformGames(consoleKey);
  const collectionSet = new Set(collectionIds);
  return allGames.filter(g => collectionSet.has(g.id));
}

/**
 * Check if a game has a front image in any of the given regions.
 */
export function hasImageInRegions(
  game: LaunchBoxGame,
  regions: string[],
): boolean {
  return regions.some(r => !!game.images[r]?.front);
}

export function searchGames(
  games: LaunchBoxGame[],
  query: string,
): LaunchBoxGame[] {
  const q = query.toLowerCase();
  return games.filter(
    g => g.title.toLowerCase().includes(q)
      || g.genre.toLowerCase().includes(q)
      || (g.alternateNames && Object.values(g.alternateNames).some(
        name => name.toLowerCase().includes(q),
      )),
  );
}

export async function clearCache(): Promise<void> {
  memoryCache.clear();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // ignore
  }
}
