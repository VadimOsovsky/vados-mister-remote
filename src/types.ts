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
  branding: string;
  colors: string[];
  ssSystemId: number;        // ScreenScraper system ID
  wizzoSystemId: string;     // MiSTer/Wizzo system ID for searchGames() API
  mediaRegions: string[];    // Priority order for media region resolution (SS short codes: 'us', 'eu', 'jp', 'wor')
  collection: number[];      // ScreenScraper game IDs in user's collection
}

// ── SCREENSCRAPER ──

/** A single media asset from ScreenScraper */
export interface SSMedia {
  type: string;       // e.g. 'box-2D', 'box-2D-back', 'screenshot', 'wheel', 'wheel-hd', 'fanart', 'support-2D', 'manuel'
  url: string;        // Direct image URL
  region: string;     // 'us', 'eu', 'jp', 'wor', 'ss', etc.
  format?: string;    // e.g. 'png', 'jpg', 'pdf'
}

/** Normalized game data from ScreenScraper API */
export interface SSGame {
  id: number;
  name: string;               // Resolved name (preferred region/language)
  synopsis: string;            // Resolved description
  publisher: string;
  developer: string;
  players: string;
  rating: string;              // Note out of 20
  genre: string;
  releaseDate: string;         // yyyy-mm-dd or yyyy
  medias: SSMedia[];
}
