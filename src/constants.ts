import type { ConsoleKey, PlatformDef, SortMode } from './types';

// ── PLATFORMS ──
// ssSystemId values from ScreenScraper API (systemesListe.php)
// mediaRegions use SS short codes from regionsListe.php
// collection contains ScreenScraper game IDs (discover via scripts/discover-ss-ids.ts)
//
// TODO: Run discover-ss-ids.ts and fetch-screenscraper.ts to populate
// collection IDs and generate static JSON data.

export const PLATFORMS: Record<ConsoleKey, PlatformDef> = {
  nes_ntsc: {
    name: 'NES',
    icon: '🎮',
    theme: 'theme-nes-ntsc',
    branding: 'Nintendo Entertainment System',
    colors: ['#c0392b', '#e74c3c', '#d35400', '#e67e22'],
    ssSystemId: 3,
    wizzoSystemId: 'NES',
    mediaRegions: ['us', 'wor', 'ss'],
    collection: [],
  },
  nes_pal: {
    name: 'NES (PAL)',
    icon: '🎮',
    theme: 'theme-nes-pal',
    branding: 'Nintendo Entertainment System',
    colors: ['#2c3e50', '#34495e', '#c0392b', '#e74c3c'],
    ssSystemId: 3,
    wizzoSystemId: 'NES',
    mediaRegions: ['eu', 'wor', 'ss'],
    collection: [],
  },
  famicom: {
    name: 'Famicom',
    icon: '🟥',
    theme: 'theme-famicom',
    branding: 'Family Computer',
    colors: ['#c0392b', '#a93226', '#922B21', '#7B241C'],
    ssSystemId: 3,
    wizzoSystemId: 'NES',
    mediaRegions: ['jp', 'wor', 'ss'],
    collection: [1245],  // Super Mario Bros.
  },
  av_famicom: {
    name: 'AV Famicom',
    icon: '⬜',
    theme: 'theme-av-famicom',
    branding: 'New Famicom',
    colors: ['#636e72', '#2d3436', '#b2bec3', '#dfe6e9'],
    ssSystemId: 3,
    wizzoSystemId: 'NES',
    mediaRegions: ['jp', 'wor', 'ss'],
    collection: [1245],  // Super Mario Bros.
  },
};

// ── DERIVED MAPS (for backward compat) ──
export const CONSOLE_KEYS = Object.keys(PLATFORMS) as ConsoleKey[];

export const CONSOLE_NAMES: Record<ConsoleKey, string> =
  Object.fromEntries(CONSOLE_KEYS.map(k => [k, PLATFORMS[k].name])) as Record<ConsoleKey, string>;

export const CONSOLE_ICONS: Record<ConsoleKey, string> =
  Object.fromEntries(CONSOLE_KEYS.map(k => [k, PLATFORMS[k].icon])) as Record<ConsoleKey, string>;

export const CONSOLE_THEMES: Record<ConsoleKey, string> =
  Object.fromEntries(CONSOLE_KEYS.map(k => [k, PLATFORMS[k].theme])) as Record<ConsoleKey, string>;

export const CONSOLE_COLORS: Record<ConsoleKey, string[]> =
  Object.fromEntries(CONSOLE_KEYS.map(k => [k, PLATFORMS[k].colors])) as Record<ConsoleKey, string[]>;

// ── SORT ──
export const SORT_MODES: { key: SortMode; label: string }[] = [
  { key: 'az', label: 'A-Z' },
  { key: 'za', label: 'Z-A' },
  { key: 'recent', label: 'Recent' },
  { key: 'most', label: 'Most' },
];
