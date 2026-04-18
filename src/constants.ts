import type { ConsoleKey, PlatformDef, SortMode } from './types';

// ── PLATFORMS ──
export const PLATFORMS: Record<ConsoleKey, PlatformDef> = {
  nes_ntsc: {
    name: 'NES',
    icon: '🎮',
    theme: 'theme-nes-ntsc',
    branding: 'Nintendo Entertainment System',
    colors: ['#c0392b', '#e74c3c', '#d35400', '#e67e22'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['North America', 'United States', 'Canada', 'World'],
  },
  nes_pal: {
    name: 'NES (PAL)',
    icon: '🎮',
    theme: 'theme-nes-pal',
    branding: 'Nintendo Entertainment System',
    colors: ['#2c3e50', '#34495e', '#c0392b', '#e74c3c'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Europe', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Australia'],
  },
  famicom: {
    name: 'Famicom',
    icon: '🟥',
    theme: 'theme-famicom',
    branding: 'Family Computer',
    colors: ['#c0392b', '#a93226', '#922B21', '#7B241C'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
  },
  av_famicom: {
    name: 'AV Famicom',
    icon: '⬜',
    theme: 'theme-av-famicom',
    branding: 'AV Famicom',
    colors: ['#2d2d2d', '#3a3a3a', '#c0392b', '#e8c840'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
    collectionGroup: 'famicom',
  },
  fds: {
    name: 'FDS',
    icon: '💾',
    theme: 'theme-famicom',
    branding: 'Famicom Disk System',
    colors: ['#c0392b', '#a93226', '#922B21', '#7B241C'],
    lbPlatform: 'fds',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
  },
};

// ── PAGE-SPECIFIC KEY ARRAYS ──
export const COLLECTION_KEYS: ConsoleKey[] = ['nes_ntsc', 'nes_pal', 'famicom', 'av_famicom'];
export const STORE_KEYS: ConsoleKey[] = ['nes_ntsc', 'nes_pal', 'famicom', 'av_famicom', 'fds'];

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
