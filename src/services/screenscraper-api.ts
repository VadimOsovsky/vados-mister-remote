/**
 * ScreenScraper API v2 client.
 * Thin typed wrapper — no external dependencies.
 *
 * API docs: https://www.screenscraper.fr/webapi2.php
 */
import type { SSGame, SSMedia } from '../types';

const API_BASE = 'https://api.screenscraper.fr/api2';

// Language priority for text fields (synopsis)
const LANG_PRIORITY = ['en', 'us', 'wor', 'eu', 'fr'];
// Region priority for name resolution
const REGION_PRIORITY = ['wor', 'us', 'eu', 'jp', 'ss'];

// ── Error types ──

export class SSApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'SSApiError';
    this.status = status;
  }
}

// ── API client ──

export class ScreenScraperApi {
  private devId: string;
  private devPassword: string;
  private softName: string;
  private ssId?: string;
  private ssPassword?: string;

  constructor(devId: string, devPassword: string, softName = 'mister-remote') {
    this.devId = devId;
    this.devPassword = devPassword;
    this.softName = softName;
  }

  setUserCredentials(ssId: string, ssPassword: string): void {
    this.ssId = ssId;
    this.ssPassword = ssPassword;
  }

  clearUserCredentials(): void {
    this.ssId = undefined;
    this.ssPassword = undefined;
  }

  private buildParams(extra: Record<string, string>): URLSearchParams {
    const params: Record<string, string> = {
      devid: this.devId,
      devpassword: this.devPassword,
      softname: this.softName,
      output: 'json',
      ...extra,
    };
    if (this.ssId && this.ssPassword) {
      params.ssid = this.ssId;
      params.sspassword = this.ssPassword;
    }
    return new URLSearchParams(params);
  }

  private async request(endpoint: string, params: Record<string, string>): Promise<unknown> {
    const url = `${API_BASE}/${endpoint}?${this.buildParams(params)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new SSApiError(res.status, `ScreenScraper API ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  /** Get game by ScreenScraper numeric game ID */
  async getGame(gameId: number, systemId?: number): Promise<SSGame> {
    const params: Record<string, string> = { gameid: String(gameId) };
    if (systemId != null) params.systemeid = String(systemId);
    const data = await this.request('jeuInfos.php', params) as JeuInfosResponse;
    return normalizeGame(data.response.jeu);
  }

  /** Search games by name, optionally within a specific system. Returns up to 30 results. */
  async searchGames(query: string, systemId?: number): Promise<SSGame[]> {
    const params: Record<string, string> = { recherche: query };
    if (systemId != null) params.systemeid = String(systemId);
    const data = await this.request('jeuRecherche.php', params) as JeuRechercheResponse;
    const jeux = data.response?.jeux;
    if (!jeux || !Array.isArray(jeux)) return [];
    return jeux.map(normalizeGame);
  }
}

// ── Raw API response types ──

interface JeuInfosResponse {
  response: {
    jeu: RawGame;
  };
}

interface JeuRechercheResponse {
  response: {
    jeux?: RawGame[];
  };
}

interface RawNom { region: string; text: string }
interface RawSynopsis { langue: string; text: string }
interface RawDate { region: string; text: string }
interface RawGenre {
  id: string;
  noms: { langue: string; text: string }[];
}
interface RawMedia {
  type: string;
  url: string;
  region?: string;
  format: string;
}

interface RawGame {
  id: string | number;
  noms?: RawNom[];
  synopsis?: RawSynopsis[];
  editeur?: { text: string } | string;
  developpeur?: { text: string } | string;
  joueurs?: { text: string } | string;
  note?: { text: string } | string | number;
  dates?: RawDate[];
  genres?: RawGenre[];
  medias?: RawMedia[];
}

// ── Normalization ──

function extractText(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null && 'text' in val) {
    return String((val as { text: unknown }).text);
  }
  return '';
}

function findByRegion(arr: { region: string; text: string }[] | undefined, priorities: string[]): string {
  if (!arr?.length) return '';
  for (const r of priorities) {
    const found = arr.find(item => item.region === r);
    if (found) return found.text;
  }
  return arr[0].text;
}

function findByLangue(arr: { langue: string; text: string }[] | undefined, priorities: string[]): string {
  if (!arr?.length) return '';
  for (const l of priorities) {
    const found = arr.find(item => item.langue === l);
    if (found) return found.text;
  }
  return arr[0].text;
}

function resolveName(raw: RawGame): string {
  return findByRegion(raw.noms, REGION_PRIORITY);
}

function resolveSynopsis(raw: RawGame): string {
  return findByLangue(raw.synopsis, LANG_PRIORITY);
}

function resolveDate(raw: RawGame): string {
  return findByRegion(raw.dates, ['wor', 'us', 'eu', 'jp', 'fr']);
}

function resolveGenre(raw: RawGame): string {
  if (!raw.genres?.length) return '';
  return raw.genres
    .map(g => findByLangue(g.noms, LANG_PRIORITY))
    .filter(Boolean)
    .join(', ');
}

function parseMedias(medias: RawMedia[] | undefined): SSMedia[] {
  if (!medias?.length) return [];
  return medias.map(m => ({
    type: m.type,
    url: m.url,
    region: m.region || 'ss',
    format: m.format || undefined,
  }));
}

function normalizeGame(raw: RawGame): SSGame {
  const date = resolveDate(raw);
  return {
    id: typeof raw.id === 'number' ? raw.id : parseInt(String(raw.id), 10),
    name: resolveName(raw),
    synopsis: resolveSynopsis(raw),
    publisher: extractText(raw.editeur),
    developer: extractText(raw.developpeur),
    players: extractText(raw.joueurs),
    rating: extractText(raw.note),
    genre: resolveGenre(raw),
    releaseDate: date,
    medias: parseMedias(raw.medias),
  };
}
