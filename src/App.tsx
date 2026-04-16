import {useCallback, useEffect, useMemo, useState} from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import './App.css';
import {KEYBOARD_KEYS, WizzoApi, type WizzoGameSearchResult} from './services/wizzoApi';
import {PLATFORMS} from './constants';
import type {ConsoleKey, SSGame} from './types';
import {
    buildGallerySlides,
    initApi,
    loadCollectionGames,
    resolveBackThumb,
    resolveCartridgeThumb,
    resolveFrontThumb,
    resolveManualUrl,
    resolveMediaUrl,
    searchLocal,
} from './services/screenscraper';

// ── Types ──
type AppTab = 'collection' | 'store' | 'settings';
type SheetTab = 'main' | 'library' | 'controls';

// ── Init ScreenScraper API ──
const authData = localStorage.getItem('mister_auth');
if (authData) {
    const { login, password } = JSON.parse(authData);
    if (login && password) initApi(login, password);
}

// ── SVG Icons (inline, no deps) ──
const Icons = {
    search: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
        </svg>
    ),
    sort: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M6 12h12M9 18h6"/>
        </svg>
    ),
    grid: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
    ),
    store: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
    ),
    settings: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
    ),
    play: (
        <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
        </svg>
    ),
    reset: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
    ),
    disk: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    ),
    screenshot: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
        </svg>
    ),
    osd: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8"/>
            <path d="M12 17v4"/>
            <path d="M6 8h12"/>
            <path d="M6 12h8"/>
        </svg>
    ),
    home: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
    ),
    save: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
        </svg>
    ),
    load: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
    ),
    main: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
        </svg>
    ),
    book: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
    ),
    gamepad: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
             strokeLinejoin="round">
            <path d="M6 12h4"/>
            <path d="M8 10v4"/>
            <path d="M15 13h.01"/>
            <path d="M18 11h.01"/>
            <rect x="2" y="6" width="20" height="12" rx="2"/>
        </svg>
    ),
};

// ── ROM mapping (localStorage) ──
const ROM_MAPPINGS_KEY = 'rom_mappings';

function getRomMapping(ssGameId: number, consoleKey: ConsoleKey): string | null {
    try {
        const raw = localStorage.getItem(ROM_MAPPINGS_KEY);
        if (!raw) return null;
        const mappings: Record<string, string> = JSON.parse(raw);
        return mappings[`${ssGameId}_${consoleKey}`] ?? null;
    } catch {
        return null;
    }
}

function setRomMapping(ssGameId: number, consoleKey: ConsoleKey, romPath: string): void {
    try {
        const raw = localStorage.getItem(ROM_MAPPINGS_KEY);
        const mappings: Record<string, string> = raw ? JSON.parse(raw) : {};
        mappings[`${ssGameId}_${consoleKey}`] = romPath;
        localStorage.setItem(ROM_MAPPINGS_KEY, JSON.stringify(mappings));
    } catch { /* localStorage full or unavailable */ }
}

// ── LazyImage component ──
function LazyImage({src, alt, className, style}: {
    src?: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties
}) {
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
    const [sheetTab, setSheetTab] = useState<SheetTab>('main');
    const [connected, setConnected] = useState(false);
    console.log('VO: connected', connected)
    const [misterHost] = useState(() => localStorage.getItem('mister_host') || import.meta.env.VITE_WIZZO_ADDRESS || '');
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [games, setGames] = useState<SSGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [romPickerOpen, setRomPickerOpen] = useState(false);
    const [romSearchQuery, setRomSearchQuery] = useState('');
    const [romSearchResults, setRomSearchResults] = useState<WizzoGameSearchResult[]>([]);
    const [romSearchLoading, setRomSearchLoading] = useState(false);
    const [romSearchError, setRomSearchError] = useState<string | null>(null);

    const api = useMemo(() => new WizzoApi(misterHost), [misterHost]);
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
        return () => {
            cancelled = true;
        };
    }, [activeConsole]);

    // ── Connection: heartbeat polling ──
    useEffect(() => {
        let pollTimer: ReturnType<typeof setInterval>;
        let alive = true;

        async function poll() {
            try {
                await api.getSysInfo();
                if (alive) setConnected(true);
            } catch {
                if (alive) setConnected(false);
            }
        }

        poll();
        pollTimer = setInterval(poll, 10_000);

        return () => {
            alive = false;
            clearInterval(pollTimer);
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
        setSheetTab('main');
    }, []);

    const closeSheet = useCallback(() => {
        setSelectedGame(null);
        setRomPickerOpen(false);
        setRomSearchResults([]);
        setRomSearchError(null);
    }, []);

    const openRomPicker = useCallback((gameName: string) => {
        setRomSearchQuery(gameName);
        setRomSearchResults([]);
        setRomSearchError(null);
        setRomPickerOpen(true);
    }, []);

    const closeRomPicker = useCallback(() => {
        setRomPickerOpen(false);
        setRomSearchResults([]);
        setRomSearchError(null);
    }, []);

    const searchRoms = useCallback(async (query: string) => {
        if (!query.trim()) {
            setRomSearchResults([]);
            return;
        }
        setRomSearchLoading(true);
        setRomSearchError(null);
        setRomSearchResults([]);

        try {
            // Direct search
            try {
                const response = await api.searchGames(query, platform.wizzoSystemId);
                const results = response.data ?? [];
                setRomSearchResults(results);
                setRomSearchError(results.length ? null : 'No ROMs found. Try a different search term.');
                return;
            } catch {
                // Index likely doesn't exist — generate and poll below
            }

            // Generate index (ignore errors — may already be generating)
            setRomSearchError('Game index not found. Generating...');
            try { await api.generateIndex(); } catch { /* ok */ }

            // Poll: retry search every 3s, up to 40 attempts (~2 min)
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 3000));
                try {
                    const response = await api.searchGames(query, platform.wizzoSystemId);
                    const results = response.data ?? [];
                    setRomSearchResults(results);
                    setRomSearchError(results.length ? null : 'No ROMs found. Try a different search term.');
                    return;
                } catch {
                    setRomSearchError(`Generating game index... (${i + 1}/40)`);
                }
            }

            setRomSearchError('Index generation timed out. Try again later.');
        } finally {
            setRomSearchLoading(false);
        }
    }, [api, platform.wizzoSystemId]);

    const selectRom = useCallback(async (result: WizzoGameSearchResult) => {
        if (!selectedGame) return;
        setRomMapping(selectedGame.id, activeConsole, result.path);
        setRomPickerOpen(false);
        try {
            await api.launchGame(result.path);
        } catch {
            // Launch failed right after selecting — reopen picker
            openRomPicker(selectedGame.name);
        }
    }, [selectedGame, activeConsole, api, openRomPicker]);

    const handleLaunchGame = useCallback(async () => {
        if (!selectedGame) return;
        const cachedPath = getRomMapping(selectedGame.id, activeConsole);
        if (cachedPath) {
            try {
                await api.launchGame(cachedPath);
                return;
            } catch {
                // Cached ROM path failed — fall through to picker
            }
        }
        openRomPicker(selectedGame.name);
    }, [selectedGame, activeConsole, api, openRomPicker]);

    return (
        <div className={`app ${platform.theme}`}>
            <div className="app-content">
                {/* ── Header ── */}
                <div className="header">
                    <div className="header-top">
                        <div className="header-title">MiSTer Remote</div>
                        <div className="status-badge">
                            <div className={`status-dot ${connected ? '' : 'offline'}`}/>
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
                    {loading && <div className="loading-bar"/>}
                </div>
                <div className="section-label">Collection · {filteredGames.length} games</div>
                <div className="game-grid">
                    {filteredGames.map((game) => {
                        const front = resolveFrontThumb(game, platform.mediaRegions);
                        const rotStyle = front?.rotation ? {transform: `rotate(${front.rotation}deg)`} : undefined;
                        return (
                            <div key={game.id} className="game-card" onClick={() => openSheet(game)}>
                                <div className="card-art-wrap">
                                    <LazyImage src={front?.src} alt={game.name} className="card-art" style={rotStyle}/>
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
                    <div className="branding-line"/>
                    <span className="branding-text">{platform.branding}</span>
                    <div className="branding-line"/>
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
                const frontRotStyle = front?.rotation ? {transform: `rotate(${front.rotation}deg)`} : undefined;
                const backRotStyle = back?.rotation ? {transform: `rotate(${back.rotation}deg)`} : undefined;
                const cartRotStyle = cartridge?.rotation ? {transform: `rotate(${cartridge.rotation}deg)`} : undefined;

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
                                {front && <img src={front.src} alt="" className="sheet-bg-img"/>}
                            </div>

                            {/* Handle */}
                            <div className="sheet-handle"/>

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
                                        {key: 'main' as SheetTab, label: 'Main', icon: Icons.main},
                                        {key: 'library' as SheetTab, label: 'Library', icon: Icons.book},
                                        {key: 'controls' as SheetTab, label: 'Controls', icon: Icons.gamepad},
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

                                {/* ── Main tab ── */}
                                {sheetTab === 'main' && (
                                    <div className="sheet-panel">
                                        <div className="sheet-main-layout">
                                            <div className="sheet-art">
                                                {front && <img src={front.src} alt={selectedGame.name}
                                                               style={frontRotStyle}/>}
                                            </div>
                                            <div className="sheet-main-details">
                                                <div className="sheet-main-row">
                                                    <span className="sheet-main-label">Developer</span>
                                                    <span className="sheet-main-value">{selectedGame.developer}</span>
                                                </div>
                                                <div className="sheet-main-row">
                                                    <span className="sheet-main-label">Publisher</span>
                                                    <span className="sheet-main-value">{selectedGame.publisher}</span>
                                                </div>
                                                <div className="sheet-main-row">
                                                    <span className="sheet-main-label">Players</span>
                                                    <span className="sheet-main-value">{selectedGame.players}</span>
                                                </div>
                                                <div className="sheet-main-row">
                                                    <span className="sheet-main-label">Genre</span>
                                                    <span className="sheet-main-value">{selectedGame.genre}</span>
                                                </div>
                                                {selectedGame.rating && (
                                                    <div className="sheet-main-row">
                                                        <span className="sheet-main-label">Rating</span>
                                                        <span
                                                            className="sheet-main-value">{selectedGame.rating}/20</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="sheet-desc">{selectedGame.synopsis}</div>
                                        <button
                                            className="sheet-btn sheet-btn-primary ctrl-launch-btn"
                                            onClick={handleLaunchGame}
                                            disabled={!connected}
                                        >
                                            {Icons.play}
                                            <span>Launch Game</span>
                                        </button>

                                        {romPickerOpen && (
                                            <div className="rom-picker-overlay">
                                                <div className="rom-picker">
                                                    <div className="rom-picker-header">
                                                        <span className="rom-picker-title">Select ROM</span>
                                                        <button className="rom-picker-close"
                                                                onClick={closeRomPicker}>&times;</button>
                                                    </div>
                                                    <div className="rom-picker-search">
                                                        <input
                                                            className="rom-picker-input"
                                                            type="text"
                                                            value={romSearchQuery}
                                                            onChange={e => setRomSearchQuery(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') searchRoms(romSearchQuery);
                                                            }}
                                                            placeholder="Search ROMs on MiSTer..."
                                                            autoFocus
                                                        />
                                                        <button
                                                            className="rom-picker-search-btn"
                                                            onClick={() => searchRoms(romSearchQuery)}
                                                            disabled={romSearchLoading}
                                                        >
                                                            {romSearchLoading ? '...' : 'Search'}
                                                        </button>
                                                    </div>
                                                    <div className="rom-picker-results">
                                                        {romSearchLoading && (
                                                            <div className="rom-picker-status">Searching...</div>
                                                        )}
                                                        {romSearchError && !romSearchLoading && (
                                                            <div className="rom-picker-status rom-picker-error">
                                                                {romSearchError}
                                                            </div>
                                                        )}
                                                        {!romSearchLoading && romSearchResults.map(result => (
                                                            <button
                                                                key={result.path}
                                                                className="rom-picker-result"
                                                                onClick={() => selectRom(result)}
                                                            >
                                                                <span className="rom-picker-result-name">{result.name}</span>
                                                                <span className="rom-picker-result-path">{result.path}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Library tab ── */}
                                {sheetTab === 'library' && (
                                    <div className="sheet-panel">
                                        <div className="library-covers">
                                            <div
                                                className={`library-cover${front ? ' library-cover-clickable' : ''}`}
                                                onClick={() => {
                                                    if (front) {
                                                        setGalleryIndex(frontGalleryIdx);
                                                        setGalleryOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="library-cover-label">Front</div>
                                                <div className="library-cover-frame">
                                                    {front
                                                        ? <img src={front.src} alt="Front cover" style={frontRotStyle}/>
                                                        : <div className="library-cover-empty">No image</div>}
                                                </div>
                                            </div>
                                            <div
                                                className={`library-cover${back ? ' library-cover-clickable' : ''}`}
                                                onClick={() => {
                                                    if (back) {
                                                        setGalleryIndex(backGalleryIdx);
                                                        setGalleryOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="library-cover-label">Back</div>
                                                <div className="library-cover-frame">
                                                    {back
                                                        ? <img src={back.src} alt="Back cover" style={backRotStyle}/>
                                                        : <div className="library-cover-empty">No image</div>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="library-covers">
                                            <div
                                                className={`library-cover${cartridge ? ' library-cover-clickable' : ''}`}
                                                onClick={() => {
                                                    if (cartridge) {
                                                        setGalleryIndex(cartGalleryIdx);
                                                        setGalleryOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="library-cover-label">Cartridge</div>
                                                <div className="library-cover-frame">
                                                    {cartridge
                                                        ?
                                                        <img src={cartridge.src} alt="Cartridge" style={cartRotStyle}/>
                                                        : <div className="library-cover-empty">No image</div>}
                                                </div>
                                            </div>
                                            <div className="library-cover"/>
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
                                        {/* Control grid */}
                                        <div className="ctrl-grid">
                                            <button className="ctrl-btn"
                                                    onClick={() => api.sendKey(KEYBOARD_KEYS.user)}>
                                                {Icons.reset}
                                                <span>Reset</span>
                                            </button>
                                            <button className="ctrl-btn" onClick={() => api.sendKey(KEYBOARD_KEYS.osd)}>
                                                {Icons.osd}
                                                <span>OSD Menu</span>
                                            </button>
                                            {/*<button className="ctrl-btn" onClick={() => api.takeScreenshot()}>*/}
                                            {/*    {Icons.screenshot}*/}
                                            {/*    <span>Screenshot</span>*/}
                                            {/*</button>*/}
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
