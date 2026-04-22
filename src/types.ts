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
  locked?: boolean;
  beaten?: boolean;
}

// ── CONSOLE CONTROLS ──
export interface ConsoleControl {
  id: string;
  label: string;
  action: string;
  type?: 'key' | 'launch';
}

// ── PLATFORM DEFINITION ──
export interface PlatformDef {
  name: string;
  logo: string;
  theme: string;
  branding: string;
  colors: string[];
  lbPlatform: string;        // LaunchBox JSON file name (without .json)
  wizzoSystemId: string;     // MiSTer/Wizzo system ID for searchGames() API
  imageRegions: string[];    // Priority order for image region resolution
  nameRegions?: string[];    // Priority order for alternate name resolution
  collectionGroup?: ConsoleKey; // Share collection storage with another console
  imageUrl?: string;
  controls?: ConsoleControl[];
  launchPath?: string;        // Override: launch this file path instead of launchSystem()
  mglConfig?: { setname: string; rbf: string }; // Zaparoo MGL launch with setname for region config
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
  alternateNames?: Record<string, string>;
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
