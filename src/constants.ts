import type { ConsoleKey, PlatformDef, SortMode } from './types';
import avFamicomFdsPhoto from './assets/consoles/av-famicom-fds.webp';
import playStationPhoto from './assets/consoles/playstation.png';
import psOnePhoto from './assets/consoles/psone.png';

// ── CONTROLS ──
const LAUNCH_CORE = { id: 'launch_core', label: 'Launch', action: '', type: 'launch' } as const;
const RESET = { id: 'reset', label: 'Reset console', action: 'user' } as const;
const FLIP_DISK = { id: 'flip_disk', label: 'Flip Disk', action: 'user' } as const;

// ── PLATFORMS ──
const NES_NTSC_MGL = { rbf: '_Console/NES', systemType: 'NTSC' } as const;
const SNES_NTSC_MGL = { rbf: '_Console/SNES', systemType: 'NTSC', optionName: 'Video Region' } as const;
const SNES_PAL_REGIONS = ['Europe', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'The Netherlands', 'Sweden', 'Australia', 'Oceania'];
const SNES_PAL_THEME = 'theme-snes-pal';
const SNES_PLATFORM = {
  mediaLabel: 'Cartridge',
  branding: 'Super Nintendo Entertainment System',
  lbPlatform: 'snes',
  wizzoSystemId: 'SNES',
  controls: [LAUNCH_CORE, RESET],
  mglConfig: SNES_NTSC_MGL,
};

export const PLATFORMS: Record<ConsoleKey, PlatformDef> = {
  nes_ntsc: {
    name: 'NES',
    mediaLabel: 'Cartridge',
    logo: `${import.meta.env?.BASE_URL ?? '/'}consoles/nes_logo.png`,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/NES-Console-Set.png/960px-NES-Console-Set.png',
    theme: 'theme-nes-ntsc',
    branding: 'Nintendo Entertainment System',
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['North America', 'United States', 'Canada', 'World'],
    controls: [LAUNCH_CORE, RESET],
    mglConfig: NES_NTSC_MGL,
  },
  nes_pal: {
    name: 'NES (PAL)',
    mediaLabel: 'Cartridge',
    logo: `${import.meta.env?.BASE_URL ?? '/'}consoles/nes_logo.png`,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Wikipedia_NES_PAL.jpg/960px-Wikipedia_NES_PAL.jpg',
    theme: 'theme-nes-pal',
    branding: 'Nintendo Entertainment System',
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Europe', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Australia'],
    controls: [LAUNCH_CORE, RESET],
    mglConfig: { setname: 'NES_PAL', rbf: '_Console/NES', systemType: 'PAL' },
  },
  famicom: {
    name: 'Famicom',
    mediaLabel: 'Cartridge',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Family_Computer_logo.svg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Nintendo-Famicom-Console-Set-FL.png/960px-Nintendo-Famicom-Console-Set-FL.png',
    theme: 'theme-famicom',
    branding: 'Family Computer',
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
    nameRegions: ['Japan'],
    controls: [LAUNCH_CORE, RESET],
    mglConfig: NES_NTSC_MGL,
  },
  fds: {
    name: 'FDS',
    mediaLabel: 'Disk',
    coverScale: 0.85,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Family_Computer_Disk_System_logo.png',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Nintendo-Famicom-Disk-System.png/960px-Nintendo-Famicom-Disk-System.png',
    theme: 'theme-famicom',
    branding: 'Famicom Disk System',
    lbPlatform: 'fds',
    wizzoSystemId: 'FDS',
    imageRegions: ['Japan', 'Asia', 'World'],
    nameRegions: ['Japan'],
    controls: [LAUNCH_CORE, RESET, FLIP_DISK],
    launchPath: '/media/fat/games/NES/_fds_boot.fds',
    mglConfig: NES_NTSC_MGL,
  },
  av_famicom: {
    name: 'AV Famicom',
    mediaLabel: 'Cartridge',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Famicom_Family_logo.svg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/New_Famicom.jpg',
    theme: 'theme-av-famicom',
    branding: 'AV Famicom',
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: ['Japan', 'Asia', 'World'],
    nameRegions: ['Japan'],
    collectionGroup: 'famicom',
    controls: [LAUNCH_CORE, RESET],
    mglConfig: NES_NTSC_MGL,
  },
  av_famicom_fds: {
    name: 'AV Famicom FDS',
    mediaLabel: 'Disk',
    coverScale: 0.85,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Family_Computer_Disk_System_logo.png',
    imageUrl: avFamicomFdsPhoto,
    theme: 'theme-av-famicom',
    branding: 'AV Famicom Disk System',
    lbPlatform: 'fds',
    wizzoSystemId: 'FDS',
    imageRegions: ['Japan', 'Asia', 'World'],
    nameRegions: ['Japan'],
    collectionGroup: 'fds',
    controls: [LAUNCH_CORE, RESET, FLIP_DISK],
    launchPath: '/media/fat/games/NES/_fds_boot.fds',
    mglConfig: NES_NTSC_MGL,
  },
  dendy: {
    name: 'Dendy',
    mediaLabel: 'Cartridge',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Dendy_console_logo.svg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dendy_Junior_with_cart_and_joypads.png/960px-Dendy_Junior_with_cart_and_joypads.png',
    theme: 'theme-dendy',
    branding: 'Dendy',
    lbPlatform: 'nes',
    wizzoSystemId: 'NES',
    imageRegions: [],
    controls: [LAUNCH_CORE, RESET],
    mglConfig: { setname: 'NES_Dendy', rbf: '_Console/NES', systemType: 'Dendy' },
  },
  snes_us: {
    ...SNES_PLATFORM,
    name: 'SNES (US)',
    theme: 'theme-snes-us',
    imageRegions: ['North America', 'United States', 'Canada', 'World'],
  },
  snes_pal: {
    ...SNES_PLATFORM,
    theme: SNES_PAL_THEME,
    name: 'SNES (PAL)',
    imageRegions: [...SNES_PAL_REGIONS, 'World'],
    nameRegions: SNES_PAL_REGIONS,
    mglConfig: { ...SNES_NTSC_MGL, setname: 'SNES_PAL', systemType: 'PAL' },
  },
  super_famicom: {
    ...SNES_PLATFORM,
    theme: SNES_PAL_THEME,
    name: 'Super Famicom',
    branding: 'Super Famicom',
    imageRegions: ['Japan', 'Asia', 'World'],
    nameRegions: ['Japan'],
  },
  n64: {
    name: 'Nintendo 64',
    mediaLabel: 'Cartridge',
    theme: 'theme-n64',
    branding: 'Nintendo 64',
    lbPlatform: 'n64',
    wizzoSystemId: 'Nintendo64',
    imageRegions: ['North America', 'United States', 'Europe', 'Japan', 'World'],
    showFullCatalog: true,
    controls: [LAUNCH_CORE, RESET],
  },
};

// ── DERIVED MAPS (for backward compat) ──
export const CONSOLE_KEYS = Object.keys(PLATFORMS) as ConsoleKey[];

// Hardware families are independent of the groups used to share game collections.
export const CONSOLE_GROUPS: {
  id: string;
  name: string;
  consoles: readonly ConsoleKey[];
  unavailable?: readonly { id: string; name: string; photo?: string }[];
}[] = [
  { id: 'nes', name: 'NES', consoles: ['nes_ntsc', 'nes_pal', 'famicom', 'fds', 'av_famicom', 'av_famicom_fds', 'dendy'] },
  { id: 'snes', name: 'Super Nintendo', consoles: ['snes_us', 'snes_pal', 'super_famicom'] },
  { id: 'n64', name: 'Nintendo 64', consoles: ['n64'] },
  {
    id: 'playstation',
    name: 'PlayStation',
    consoles: [],
    unavailable: [
      { id: 'ps1-fat', name: 'PlayStation (Fat)', photo: playStationPhoto },
      { id: 'ps-one', name: 'PS one', photo: psOnePhoto },
    ],
  },
];
export const STARTER_CONSOLE: ConsoleKey = 'nes_ntsc';

export const CONSOLE_NAMES: Record<ConsoleKey, string> =
  Object.fromEntries(CONSOLE_KEYS.map(k => [k, PLATFORMS[k].name])) as Record<ConsoleKey, string>;

// ── SORT ──
export const SORT_MODES: { key: SortMode; label: string }[] = [
  { key: 'az', label: 'A-Z' },
  { key: 'za', label: 'Z-A' },
  { key: 'recent', label: 'Recent' },
  { key: 'most', label: 'Most' },
];
