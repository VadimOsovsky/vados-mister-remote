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

export type ConsoleKey = 'nes_ntsc' | 'nes_pal' | 'famicom' | 'av_famicom';
export type SortMode = 'az' | 'za' | 'recent' | 'most';
export type TabKey = 'games' | 'favorites' | 'recents' | 'settings';
export type SheetTab = 'info' | 'library' | 'controls';

// ── PLATFORM DEFINITION ──
export interface PlatformDef {
  name: string;
  icon: string;
  theme: string;
  colors: string[];
  lbPlatform: string;        // LaunchBox JSON file name (without .json)
  imageRegions: string[];    // Priority order for image region resolution
  collection: string[];      // LaunchBox game IDs in user's "collection"
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
  images: Record<string, LaunchBoxImages>;
}
