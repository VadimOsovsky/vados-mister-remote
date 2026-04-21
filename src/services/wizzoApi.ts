// ── Wizzo Remote API Client ──
// Based on mrext Remote API: https://github.com/wizzomafizzo/mrext/blob/main/docs/remote-api.md

const DEFAULT_PORT = 8182;

// ── Response types ──

export interface WizzoSystem {
  id: string;
  name: string;
  category?: string;
}

export interface WizzoGameSearchResult {
  system: { id: string; name: string };
  name: string;
  path: string;
}

export interface WizzoSearchResponse {
  data: WizzoGameSearchResult[];
  total: number;
  pageSize: number;
  page: number;
}

export interface WizzoPlayingResponse {
  core: string;
  system: string;
  systemName: string;
  game: string;
  gameName: string;
}

export interface WizzoScreenshot {
  game: string;
  filename: string;
  path: string;
  core: string;
  modified: string;
}

export interface WizzoSysInfo {
  ips: string[];
  hostname: string;
  dns: string;
  version: string;
  updated: string;
  disks: WizzoDisk[];
}

export interface WizzoDisk {
  path: string;
  total: number;
  used: number;
  free: number;
  displayName: string;
}

export interface WizzoIniFile {
  id: number;
  displayName: string;
  filename: string;
  path: string;
}

export interface WizzoInisResponse {
  active: number;
  inis: WizzoIniFile[];
}

export interface WizzoScript {
  name: string;
  filename: string;
  path: string;
}

export interface WizzoScriptsResponse {
  canLaunch: boolean;
  scripts: WizzoScript[];
}

export interface WizzoMusicStatus {
  running: boolean;
  playing: boolean;
  playback: 'random' | 'loop' | 'disabled';
  playlist: string;
  track: string;
}

export interface WizzoWallpaper {
  name: string;
  filename: string;
  width: number;
  height: number;
  active: boolean;
}

export interface WizzoWallpapersResponse {
  active: string;
  backgroundMode: number;
  wallpapers: WizzoWallpaper[];
}

export interface WizzoMenuItem {
  name: string;
  path: string;
  parent: string;
  filename: string;
  extension: string;
  type: 'folder' | 'mra' | 'rbf' | 'mgl' | 'unknown';
  modified: string;
  version?: string;
  size: number;
}

export interface WizzoPeer {
  hostname: string;
  version: string;
  ip: string;
}

// ── WebSocket event types ──

export type WizzoWsEvent =
  | { type: 'coreRunning'; name: string }
  | { type: 'gameRunning'; system: string; name: string }
  | { type: 'menuNavigation'; folder: string; menuItem: string }
  | { type: 'indexStatus'; exists: boolean; inProgress: boolean; totalSteps: number; currentStep: number; description: string };

// ── API Client ──

export class WizzoApi {
  private baseUrl: string;

  constructor(host: string, port = DEFAULT_PORT) {
    this.baseUrl = `http://${host}:${port}/api`;
  }

  get host(): string {
    const url = new URL(this.baseUrl);
    return url.hostname;
  }

  get wsUrl(): string {
    return `${this.baseUrl.replace('http', 'ws')}/ws`;
  }

  private async request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, options);
    if (!res.ok) {
      throw new Error(`Wizzo API error: ${res.status} ${res.statusText} on ${path}`);
    }
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text);
    } catch {
      return undefined as T;
    }
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  private put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // ── System Info ──

  getSysInfo(): Promise<WizzoSysInfo> {
    return this.get('/sysinfo');
  }

  // ── Systems ──

  listSystems(): Promise<WizzoSystem[]> {
    return this.get('/systems');
  }

  launchSystem(id: string): Promise<void> {
    return this.post(`/systems/${encodeURIComponent(id)}`);
  }

  // ── Games ──

  searchGames(query: string, system = ''): Promise<WizzoSearchResponse> {
    return this.post('/games/search', { query, system });
  }

  launchGame(path: string): Promise<void> {
    return this.post('/games/launch', { path });
  }

  getPlaying(): Promise<WizzoPlayingResponse> {
    return this.get('/games/playing');
  }

  listIndexedSystems(): Promise<{ systems: WizzoSystem[] }> {
    return this.get('/games/search/systems');
  }

  generateIndex(): Promise<void> {
    return this.post('/games/index');
  }

  // ── Launchers ──

  launch(path: string): Promise<void> {
    return this.post('/launch', { path });
  }

  launchMenu(): Promise<void> {
    return this.post('/launch/menu');
  }

  createShortcut(gamePath: string, folder: string, name: string): Promise<{ path: string }> {
    return this.post('/launch/new', { gamePath, folder, name });
  }

  // ── Controls (keyboard) ──

  sendKey(name: string): Promise<void> {
    return this.post(`/controls/keyboard/${encodeURIComponent(name)}`);
  }

  sendRawKey(code: number): Promise<void> {
    return this.post(`/controls/keyboard-raw/${code}`);
  }

  saveState(slot: number): Promise<void> {
    return this.sendWsKeyCombo(KEY_LEFTALT, KEY_F1 + slot);
  }

  loadState(slot: number): Promise<void> {
    return this.sendRawKey(KEY_F1 + slot);
  }

  flipDisk(): Promise<void> {
    return this.sendRawKey(KEY_F5);
  }

  private sendWsKeyCombo(modifierCode: number, keyCode: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket key combo timed out'));
      }, 5000);

      ws.onopen = () => {
        ws.send(`kbdRawDown:${modifierCode}`);
        ws.send(`kbdRaw:${keyCode}`);
        ws.send(`kbdRawUp:${modifierCode}`);
        clearTimeout(timeout);
        ws.close();
        resolve();
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  // ── Screenshots ──

  listScreenshots(): Promise<WizzoScreenshot[]> {
    return this.get('/screenshots');
  }

  takeScreenshot(): Promise<void> {
    return this.post('/screenshots');
  }

  getScreenshotUrl(core: string, filename: string): string {
    return `${this.baseUrl}/screenshots/${encodeURIComponent(core)}/${encodeURIComponent(filename)}`;
  }

  deleteScreenshot(core: string, filename: string): Promise<void> {
    return this.del(`/screenshots/${encodeURIComponent(core)}/${encodeURIComponent(filename)}`);
  }

  // ── Scripts ──

  listScripts(): Promise<WizzoScriptsResponse> {
    return this.get('/scripts/list');
  }

  launchScript(filename: string): Promise<void> {
    return this.post(`/scripts/launch/${encodeURIComponent(filename)}`);
  }

  killScript(): Promise<void> {
    return this.post('/scripts/kill');
  }

  openConsole(): Promise<void> {
    return this.post('/scripts/console');
  }

  // ── Settings / INI ──

  listInis(): Promise<WizzoInisResponse> {
    return this.get('/settings/inis');
  }

  setActiveIni(id: number): Promise<void> {
    return this.put('/settings/inis', { ini: id });
  }

  getIniValues(id: number): Promise<Record<string, string>> {
    return this.get(`/settings/inis/${id}`);
  }

  setIniValues(id: number, values: Record<string, string>): Promise<void> {
    return this.put(`/settings/inis/${id}`, values);
  }

  setMenuBackgroundMode(mode: number): Promise<void> {
    return this.put('/settings/core/menu', { mode });
  }

  restartRemote(): Promise<void> {
    return this.post('/settings/remote/restart');
  }

  listPeers(): Promise<{ peers: WizzoPeer[] }> {
    return this.get('/settings/remote/peers');
  }

  reboot(): Promise<void> {
    return this.post('/settings/system/reboot');
  }

  // ── Music ──

  getMusicStatus(): Promise<WizzoMusicStatus> {
    return this.get('/music/status');
  }

  playMusic(): Promise<void> {
    return this.post('/music/play');
  }

  stopMusic(): Promise<void> {
    return this.post('/music/stop');
  }

  nextTrack(): Promise<void> {
    return this.post('/music/next');
  }

  setPlayback(type: 'random' | 'loop' | 'disabled'): Promise<void> {
    return this.post(`/music/playback/${type}`);
  }

  listPlaylists(): Promise<string[]> {
    return this.get('/music/playlist');
  }

  setPlaylist(name: string): Promise<void> {
    return this.post(`/music/playlist/${encodeURIComponent(name)}`);
  }

  // ── Wallpapers ──

  listWallpapers(): Promise<WizzoWallpapersResponse> {
    return this.get('/wallpapers');
  }

  setWallpaper(filename: string): Promise<void> {
    return this.post(`/wallpapers/${encodeURIComponent(filename)}`);
  }

  clearWallpaper(): Promise<void> {
    return this.del('/wallpapers');
  }

  getWallpaperUrl(filename: string): string {
    return `${this.baseUrl}/wallpapers/${encodeURIComponent(filename)}`;
  }

  // ── Menu ──

  listMenuFolder(path: string): Promise<{ items: WizzoMenuItem[] }> {
    return this.post('/menu/view', { path });
  }

  createMenuFolder(folder: string, name: string): Promise<void> {
    return this.post('/menu/files/create', { type: 'folder', folder, name });
  }

  renameMenuItem(fromPath: string, toPath: string): Promise<void> {
    return this.post('/menu/files/rename', { fromPath, toPath });
  }

  deleteMenuItem(path: string): Promise<void> {
    return this.post('/menu/files/delete', { path });
  }

  // ── WebSocket ──

  connectWebSocket(
    onEvent: (event: WizzoWsEvent) => void,
    onError?: (error: Event) => void,
  ): WebSocket {
    const ws = new WebSocket(this.wsUrl);

    ws.onmessage = (e) => {
      const msg = String(e.data);
      const parsed = parseWsMessage(msg);
      if (parsed) onEvent(parsed);
    };

    if (onError) {
      ws.onerror = onError;
    }

    return ws;
  }
}

// ── WebSocket message parser ──

function parseWsMessage(msg: string): WizzoWsEvent | null {
  if (msg.startsWith('coreRunning:')) {
    return { type: 'coreRunning', name: msg.slice('coreRunning:'.length) };
  }

  if (msg.startsWith('gameRunning:')) {
    const payload = msg.slice('gameRunning:'.length);
    const slashIdx = payload.indexOf('/');
    if (slashIdx === -1) {
      return { type: 'gameRunning', system: '', name: '' };
    }
    return {
      type: 'gameRunning',
      system: payload.slice(0, slashIdx),
      name: payload.slice(slashIdx + 1),
    };
  }

  if (msg.startsWith('menuNavigation:')) {
    const payload = msg.slice('menuNavigation:'.length);
    const slashIdx = payload.indexOf('/');
    if (slashIdx === -1) {
      return { type: 'menuNavigation', folder: payload, menuItem: '' };
    }
    return {
      type: 'menuNavigation',
      folder: payload.slice(0, slashIdx),
      menuItem: payload.slice(slashIdx + 1),
    };
  }

  if (msg.startsWith('indexStatus:')) {
    const parts = msg.slice('indexStatus:'.length).split(',');
    if (parts.length >= 5) {
      return {
        type: 'indexStatus',
        exists: parts[0] === 'y',
        inProgress: parts[1] === 'y',
        totalSteps: Number(parts[2]),
        currentStep: Number(parts[3]),
        description: parts[4],
      };
    }
  }

  return null;
}

// ── uinput key codes for save states ──
// MiSTer save states: Alt+F1..F4 (save slots 1-4), F1..F4 (load slots 1-4)
const KEY_LEFTALT = 56;
const KEY_F1 = 59;
const KEY_F5 = 63;

// ── Named keyboard keys (common ones for game controls) ──
// Full list: https://github.com/wizzomafizzo/mrext/blob/main/cmd/remote/control/control.go

export const KEYBOARD_KEYS = {
  // Core controls
  osd: 'osd',
  reset: 'reset',
  user: 'user',
  confirm: 'confirm',
  back: 'back',
  cancel: 'cancel',

  // Navigation
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',

  // Media
  screenshot: 'screenshot',

  // Misc
  volumeUp: 'volume_up',
  volumeDown: 'volume_down',
  volumeMute: 'volume_mute',
  pairBluetooth: 'pair_bluetooth',
  changeIni: 'change_ini',
} as const;
