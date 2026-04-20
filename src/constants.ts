import type { ConsoleKey, PlatformDef, SortMode } from './types';

// ── PLATFORMS ──
export const PLATFORMS: Record<ConsoleKey, PlatformDef> = {
  nes_ntsc: {
    name: 'NES',
    logo: '/consoles/NES logo.png',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/NES-Console-Set.png/960px-NES-Console-Set.png',
    theme: 'theme-nes-ntsc',
    branding: 'Nintendo Entertainment System',
    colors: ['#c0392b', '#e74c3c', '#d35400', '#e67e22'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['North America', 'United States', 'Canada', 'World'],
    controls: [{ id: 'reset', label: 'Reset', action: 'reset' }],
  },
  nes_pal: {
    name: 'NES (PAL)',
    logo: '/consoles/NES logo.png',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Wikipedia_NES_PAL.jpg/960px-Wikipedia_NES_PAL.jpg',
    theme: 'theme-nes-pal',
    branding: 'Nintendo Entertainment System',
    colors: ['#2c3e50', '#34495e', '#c0392b', '#e74c3c'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Europe', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Australia'],
    controls: [{ id: 'reset', label: 'Reset', action: 'reset' }],
  },
  famicom: {
    name: 'Famicom',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Family_Computer_logo.svg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Nintendo-Famicom-Console-Set-FL.png/960px-Nintendo-Famicom-Console-Set-FL.png',
    theme: 'theme-famicom',
    branding: 'Family Computer',
    colors: ['#c0392b', '#a93226', '#922B21', '#7B241C'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
    controls: [{ id: 'reset', label: 'Reset', action: 'reset' }],
  },
  fds: {
    name: 'FDS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Family_Computer_Disk_System_logo.png',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Nintendo-Famicom-Disk-System.png/960px-Nintendo-Famicom-Disk-System.png',
    theme: 'theme-famicom',
    branding: 'Famicom Disk System',
    colors: ['#c0392b', '#a93226', '#922B21', '#7B241C'],
    lbPlatform: 'fds',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
    controls: [
      { id: 'reset', label: 'Reset', action: 'reset' },
      { id: 'flip_disk', label: 'Flip Disk', action: 'user' },
    ],
  },
  av_famicom: {
    name: 'AV Famicom',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Famicom_Family_logo.svg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/New_Famicom.jpg',
    theme: 'theme-av-famicom',
    branding: 'AV Famicom',
    colors: ['#2d2d2d', '#3a3a3a', '#c0392b', '#e8c840'],
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
    collectionGroup: 'famicom',
    controls: [{ id: 'reset', label: 'Reset', action: 'reset' }],
  },
};

// ── DERIVED MAPS (for backward compat) ──
export const CONSOLE_KEYS = Object.keys(PLATFORMS) as ConsoleKey[];

export const CONSOLE_NAMES: Record<ConsoleKey, string> =
  Object.fromEntries(CONSOLE_KEYS.map(k => [k, PLATFORMS[k].name])) as Record<ConsoleKey, string>;

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
