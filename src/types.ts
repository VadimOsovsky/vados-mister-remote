// ── TYPES ──
export interface Game {
  id: string;
  title: string;
  year: string;
  genre: string;
  desc: string;
  fav: boolean;
  plays: number;
  time: string;
  last: string;
  saves: number;
  hasDisk: boolean;
  boxFrontUrl?: string;
  boxBackUrl?: string;
}

export interface GameWithConsole extends Game {
  _console: string;
}

export type ConsoleKey = 'nes_ntsc' | 'nes_pal' | 'famicom' | 'av_famicom' | 'fds';
export type SortMode = 'az' | 'za' | 'recent' | 'most' | 'popular' | 'year' | 'title';
export type TabKey = 'games' | 'favorites' | 'recents' | 'settings';
export type SheetTab = 'info' | 'library' | 'controls';

// ── SAVE STATE SLOTS ──
export interface SaveSlot {
  slotIndex: number;
  screenshotCore: string;
  screenshotFilename: string;
  savedAt: string;
  gameName: string;
}

// ── PLATFORM DEFINITION ──
export interface PlatformDef {
  name: string;
  icon: string;
  theme: string;
  branding: string;
  colors: string[];
  lbPlatform: string;        // LaunchBox JSON file name (without .json)
  wizzoSystemId: string;     // MiSTer/Wizzo system ID for searchGames() API
  imageRegions: string[];    // Priority order for image region resolution
  collectionGroup?: ConsoleKey; // Share collection storage with another console
}

// ── LAUNCHBOX ──
export interface LaunchBoxImages {
  front?: string;
  back?: string;
  screenshot?: string;
}

export interface LaunchBoxGame {
  id: string;
  title: string;
  year: string;
  genre: string;
  desc: string;
  developer: string;
  publisher: string;
  maxPlayers: string;
  rating: number;
  ratingCount: number;
  images: Record<string, LaunchBoxImages>;
}

// ── GAME OVERRIDES (user customizations) ──
export interface GameOverrides {
  title?: string;
  boxFrontUrl?: string;
  boxBackUrl?: string;
  cartridgeUrl?: string;
  manualUrl?: string;
  manualPhotoUrl?: string;
  romName?: string;
}
