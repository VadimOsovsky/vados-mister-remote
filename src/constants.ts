import type { ConsoleKey, PlatformDef, SortMode } from './types';

// ── PLATFORMS ──
export const PLATFORMS: Record<ConsoleKey, PlatformDef> = {
  nes_ntsc: {
    name: 'NES',
    icon: '🎮',
    theme: 'theme-nes-ntsc',
    colors: ['#c0392b', '#e74c3c', '#d35400', '#e67e22'],
    lbPlatform: 'nes',
    imageRegions: ['North America', 'United States', 'Canada', 'World'],
    collection: ['140', '361', '1258'],  // Super Mario Bros., Mega Man 2, Contra
  },
  nes_pal: {
    name: 'NES (PAL)',
    icon: '🎮',
    theme: 'theme-nes-pal',
    colors: ['#2c3e50', '#34495e', '#c0392b', '#e74c3c'],
    lbPlatform: 'nes',
    imageRegions: ['Europe', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Australia', 'World'],
    collection: ['135', '112', '121'],  // Castlevania, Super Mario Bros. 3, Kirby's Adventure
  },
  famicom: {
    name: 'Famicom',
    icon: '🟥',
    theme: 'theme-famicom',
    colors: ['#c0392b', '#a93226', '#922B21', '#7B241C'],
    lbPlatform: 'nes',
    imageRegions: ['Japan', 'Asia', 'World'],
    collection: ['140', '1258', '135'],  // Super Mario Bros., Contra, Castlevania
  },
  av_famicom: {
    name: 'AV Famicom',
    icon: '⬜',
    theme: 'theme-av-famicom',
    colors: ['#636e72', '#2d3436', '#b2bec3', '#dfe6e9'],
    lbPlatform: 'nes',
    imageRegions: ['Japan', 'Asia', 'World'],
    collection: ['112', '361', '121'],  // Super Mario Bros. 3, Mega Man 2, Kirby's Adventure
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
