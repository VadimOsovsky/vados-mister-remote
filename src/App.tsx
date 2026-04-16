import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import './App.css';
import { WizzoApi, KEYBOARD_KEYS } from './services/wizzoApi';
import { PLATFORMS } from './constants';
import type { ConsoleKey, SSGame } from './types';
import {
  initApi,
  loadCollectionGames,
  resolveFrontThumb,
  resolveBackThumb,
  resolveCartridgeThumb,
  resolveManualUrl,
  resolveMediaUrl,
  buildGallerySlides,
  searchLocal, searchGames,
} from './services/screenscraper';

// ── Types ──
type AppTab = 'collection' | 'store' | 'settings';
type SheetTab = 'info' | 'library' | 'controls';

// ── Init ScreenScraper API ──
// Dev credentials from env (set in .env.local)
const SS_DEVID = import.meta.env.VITE_SS_DEVID || '';
const SS_DEVPASS = import.meta.env.VITE_SS_DEVPASS || '';
if (SS_DEVID && SS_DEVPASS) {
  initApi(SS_DEVID, SS_DEVPASS);
}

// ── SVG Icons (inline, no deps) ──
const Icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  sort: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M6 12h12M9 18h6" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  store: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  disk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  screenshot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  osd: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" />
      <path d="M6 8h12" /><path d="M6 12h8" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  load: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  gamepad: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h4" /><path d="M8 10v4" /><path d="M15 13h.01" /><path d="M18 11h.01" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  ),
};

// ── LazyImage component ──
function LazyImage({ src, alt, className, style }: { src?: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <div className="card-art-placeholder">🎮</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className || ''} ${loaded ? 'loaded' : ''}`}
      style={style}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
    />
  );
}

// ── Main App ──
export default function MisterRemote() {
  const [activeConsole, setActiveConsole] = useState<ConsoleKey>('nes_ntsc');
  const [activeTab, setActiveTab] = useState<AppTab>('collection');
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState<SSGame | null>(null);
  const [sheetTab, setSheetTab] = useState<SheetTab>('info');
  const [connected, setConnected] = useState(false);
  const [misterHost] = useState(() => localStorage.getItem('mister_host') || '');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [games, setGames] = useState<SSGame[]>([]);
  const [loading, setLoading] = useState(false);

  const api = useMemo(() => new WizzoApi(misterHost), [misterHost]);
  const wsRef = useRef<WebSocket | null>(null);
  const platform = PLATFORMS[activeConsole];

  // ── Load collection games when console changes ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCollectionGames(activeConsole).then(data => {
      if (!cancelled) setGames(data);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeConsole]);

  // ── Connection: WebSocket + heartbeat polling ──
  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval>;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let alive = true;

    function connectWs() {
      if (!alive) return;
      try {
        const ws = api.connectWebSocket(
          () => { if (alive) setConnected(true); },
          () => { if (alive) setConnected(false); },
        );
        ws.onopen = () => { if (alive) setConnected(true); };
        ws.onclose = () => {
          if (!alive) return;
          setConnected(false);
          wsRef.current = null;
          reconnectTimer = setTimeout(connectWs, 5000);
        };
        wsRef.current = ws;
      } catch {
        if (alive) {
          setConnected(false);
          reconnectTimer = setTimeout(connectWs, 5000);
        }
      }
    }

    async function poll() {
      try {
        await api.getSysInfo();
        if (alive) setConnected(true);
      } catch {
        if (alive) setConnected(false);
      }
    }

    connectWs();
    poll();
    pollTimer = setInterval(poll, 10_000);

    return () => {
      alive = false;
      clearInterval(pollTimer);
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [api]);

  // Filter games by search (local)
  const filteredGames = search
    ? searchLocal(games, search)
    : games;

  const switchConsole = useCallback((key: ConsoleKey) => {
    setActiveConsole(key);
    setSearch('');
  }, []);

  const openSheet = useCallback((game: SSGame) => {
    setSelectedGame(game);
    setSheetTab('info');
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedGame(null);
  }, []);

  return (
    <div className={`app ${platform.theme}`}>
      <div className="app-content">
        {/* ── Header ── */}
        <div className="header">
          <div className="header-top">
            <div className="header-title">MiSTer Remote</div>
            <div className="status-badge">
              <div className={`status-dot ${connected ? '' : 'offline'}`} />
              <span>{connected ? 'Connected' : 'Offline'}</span>
            </div>
          </div>

          {/* Console Switcher */}
          <div className="console-switcher">
            {(Object.keys(PLATFORMS) as ConsoleKey[]).map((key) => (
              <button
                key={key}
                className={`console-pill ${activeConsole === key ? 'active' : ''}`}
                onClick={() => switchConsole(key)}
              >
                <span>{PLATFORMS[key].icon}</span>
                <span>{PLATFORMS[key].name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Search ── */}
        <div className="search-bar">
          <div className="search-input-wrap">
            <span className="search-icon">{Icons.search}</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="sort-button">
            {Icons.sort}
            <span>A-Z</span>
          </button>
        </div>

        {/* ── Collection Grid ── */}
        <div className="loading-bar-wrap">
          {loading && <div className="loading-bar" />}
        </div>
        <div className="section-label">Collection · {filteredGames.length} games</div>
        <div className="game-grid">
          {filteredGames.map((game) => {
            const front = resolveFrontThumb(game, platform.mediaRegions);
            const rotStyle = front?.rotation ? { transform: `rotate(${front.rotation}deg)` } : undefined;
            return (
              <div key={game.id} className="game-card" onClick={() => openSheet(game)}>
                <div className="card-art-wrap">
                  <LazyImage src={front?.src} alt={game.name} className="card-art" style={rotStyle} />
                </div>
                <div className="card-badge">
                  <div className="card-title">{game.name}</div>
                  <div className="card-year">{String(game.releaseDate ?? '').substring(0, 4)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Console Branding ── */}
        <div className="branding-bar">
          <div className="branding-line" />
          <span className="branding-text">{platform.branding}</span>
          <div className="branding-line" />
        </div>
      </div>

      {/* ── Bottom Tab Bar ── */}
      <nav className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => setActiveTab('collection')}
        >
          {Icons.grid}
          <span className="tab-item-label">Collection</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'store' ? 'active' : ''}`}
          onClick={() => setActiveTab('store')}
        >
          {Icons.store}
          <span className="tab-item-label">Store</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          {Icons.settings}
          <span className="tab-item-label">Settings</span>
        </button>
      </nav>

      {/* ── Bottom Sheet ── */}
      {selectedGame && (() => {
        const regions = platform.mediaRegions;
        const front = resolveFrontThumb(selectedGame, regions);
        const back = resolveBackThumb(selectedGame, regions);
        const cartridge = resolveCartridgeThumb(selectedGame, regions);
        const manualUrl = resolveManualUrl(selectedGame, regions);
        const frontRotStyle = front?.rotation ? { transform: `rotate(${front.rotation}deg)` } : undefined;
        const backRotStyle = back?.rotation ? { transform: `rotate(${back.rotation}deg)` } : undefined;
        const cartRotStyle = cartridge?.rotation ? { transform: `rotate(${cartridge.rotation}deg)` } : undefined;

        // Gallery slide order matches buildGallerySlides(): front, back, cartridge, screenshot
        const hasFront = !!resolveMediaUrl(selectedGame, regions, 'box-2D');
        const hasBack = !!resolveMediaUrl(selectedGame, regions, 'box-2D-back');
        const frontGalleryIdx = 0;
        const backGalleryIdx = hasFront ? 1 : 0;
        const cartGalleryIdx = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);

        return (
          <div className="sheet-overlay" onClick={closeSheet}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              {/* Blurred background */}
              <div className="sheet-bg">
                {front && <img src={front.src} alt="" className="sheet-bg-img" />}
              </div>

              {/* Handle */}
              <div className="sheet-handle" />

              {/* Content */}
              <div className="sheet-content">
                {/* Title bar */}
                <div className="sheet-title-bar">
                  <div className="sheet-title">{selectedGame.name}</div>
                  <div className="sheet-subtitle">
                    {String(selectedGame.releaseDate ?? '').substring(0, 4)} · {selectedGame.genre}
                  </div>
                </div>

                {/* Sheet tabs */}
                <div className="sheet-tabs">
                  {([
                    { key: 'info' as SheetTab, label: 'Info', icon: Icons.info },
                    { key: 'library' as SheetTab, label: 'Library', icon: Icons.book },
                    { key: 'controls' as SheetTab, label: 'Controls', icon: Icons.gamepad },
                  ]).map((t) => (
                    <button
                      key={t.key}
                      className={`sheet-tab ${sheetTab === t.key ? 'active' : ''}`}
                      onClick={() => setSheetTab(t.key)}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* ── Info tab ── */}
                {sheetTab === 'info' && (
                  <div className="sheet-panel">
                    <div className="sheet-info-layout">
                      <div className="sheet-art">
                        {front && <img src={front.src} alt={selectedGame.name} style={frontRotStyle} />}
                      </div>
                      <div className="sheet-info-details">
                        <div className="sheet-info-row">
                          <span className="sheet-info-label">Developer</span>
                          <span className="sheet-info-value">{selectedGame.developer}</span>
                        </div>
                        <div className="sheet-info-row">
                          <span className="sheet-info-label">Publisher</span>
                          <span className="sheet-info-value">{selectedGame.publisher}</span>
                        </div>
                        <div className="sheet-info-row">
                          <span className="sheet-info-label">Players</span>
                          <span className="sheet-info-value">{selectedGame.players}</span>
                        </div>
                        <div className="sheet-info-row">
                          <span className="sheet-info-label">Genre</span>
                          <span className="sheet-info-value">{selectedGame.genre}</span>
                        </div>
                        {selectedGame.rating && (
                          <div className="sheet-info-row">
                            <span className="sheet-info-label">Rating</span>
                            <span className="sheet-info-value">{selectedGame.rating}/20</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sheet-desc">{selectedGame.synopsis}</div>
                  </div>
                )}

                {/* ── Library tab ── */}
                {sheetTab === 'library' && (
                  <div className="sheet-panel">
                    <div className="library-covers">
                      <div
                        className={`library-cover${front ? ' library-cover-clickable' : ''}`}
                        onClick={() => { if (front) { setGalleryIndex(frontGalleryIdx); setGalleryOpen(true); } }}
                      >
                        <div className="library-cover-label">Front</div>
                        <div className="library-cover-frame">
                          {front
                            ? <img src={front.src} alt="Front cover" style={frontRotStyle} />
                            : <div className="library-cover-empty">No image</div>}
                        </div>
                      </div>
                      <div
                        className={`library-cover${back ? ' library-cover-clickable' : ''}`}
                        onClick={() => { if (back) { setGalleryIndex(backGalleryIdx); setGalleryOpen(true); } }}
                      >
                        <div className="library-cover-label">Back</div>
                        <div className="library-cover-frame">
                          {back
                            ? <img src={back.src} alt="Back cover" style={backRotStyle} />
                            : <div className="library-cover-empty">No image</div>}
                        </div>
                      </div>
                    </div>
                    <div className="library-covers">
                      <div
                        className={`library-cover${cartridge ? ' library-cover-clickable' : ''}`}
                        onClick={() => { if (cartridge) { setGalleryIndex(cartGalleryIdx); setGalleryOpen(true); } }}
                      >
                        <div className="library-cover-label">Cartridge</div>
                        <div className="library-cover-frame">
                          {cartridge
                            ? <img src={cartridge.src} alt="Cartridge" style={cartRotStyle} />
                            : <div className="library-cover-empty">No image</div>}
                        </div>
                      </div>
                      <div className="library-cover" />
                    </div>
                    {manualUrl && (
                      <button
                        className="sheet-btn sheet-btn-secondary library-manual-btn"
                        onClick={() => window.open(`https://docs.google.com/gview?url=${encodeURIComponent(manualUrl)}`, '_blank')}
                      >
                        {Icons.book}
                        <span>View Manual</span>
                      </button>
                    )}
                  </div>
                )}

                {/* ── Controls tab ── */}
                {sheetTab === 'controls' && (
                  <div className="sheet-panel">
                    {/* Primary action */}
                    <button
                      className="sheet-btn sheet-btn-primary ctrl-launch-btn"
                      onClick={() => {
                        // TODO: need romPath — not available from SS, must come from MiSTer
                      }}
                    >
                      {Icons.play}
                      <span>Launch Game</span>
                    </button>

                    {/* Control grid */}
                    <div className="ctrl-grid">
                      <button className="ctrl-btn" onClick={() => api.sendKey(KEYBOARD_KEYS.reset)}>
                        {Icons.reset}
                        <span>Reset</span>
                      </button>
                      <button className="ctrl-btn" onClick={() => api.sendKey(KEYBOARD_KEYS.osd)}>
                        {Icons.osd}
                        <span>OSD Menu</span>
                      </button>
                      <button className="ctrl-btn" onClick={() => api.takeScreenshot()}>
                        {Icons.screenshot}
                        <span>Screenshot</span>
                      </button>
                      <button className="ctrl-btn" onClick={() => api.sendKey(KEYBOARD_KEYS.saveState)}>
                        {Icons.save}
                        <span>Save State</span>
                      </button>
                      <button className="ctrl-btn" onClick={() => api.sendKey(KEYBOARD_KEYS.user)}>
                        {Icons.disk}
                        <span>Swap Disk</span>
                      </button>
                      <button className="ctrl-btn" onClick={() => api.sendKey(KEYBOARD_KEYS.loadState)}>
                        {Icons.load}
                        <span>Load State</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <Lightbox
        open={galleryOpen}
        close={() => setGalleryOpen(false)}
        index={galleryIndex}
        plugins={[Zoom]}
        slides={selectedGame ? buildGallerySlides(selectedGame, platform.mediaRegions) : []}
      />
    </div>
  );
}
