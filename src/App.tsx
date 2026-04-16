import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import './App.css';
import { WizzoApi, KEYBOARD_KEYS } from './services/wizzoApi';

// ── Types ──
type ConsoleKey = 'nes_ntsc' | 'famicom';
type AppTab = 'collection' | 'store' | 'settings';
type SheetTab = 'info' | 'library' | 'controls';

interface SampleGame {
  id: string;
  title: string;
  year: string;
  genre: string;
  developer: string;
  publisher: string;
  maxPlayers: string;
  desc: string;
  fav: boolean;
  romPath: string;
  images: Record<string, { front?: string; back?: string }>;
}

// ── Image CDN ──
const CDN = 'https://images.launchbox-app.com';
const THUMB_WIDTH = 200;
const THUMB_PROXY = 'https://wsrv.nl';

// ── Console definitions ──
const CONSOLES: Record<ConsoleKey, {
  name: string;
  icon: string;
  theme: string;
  branding: string;
  imageRegions: string[];
}> = {
  nes_ntsc: {
    name: 'NES',
    icon: '🎮',
    theme: 'theme-nes-ntsc',
    branding: 'Nintendo Entertainment System',
    imageRegions: ['North America', 'United States', 'Canada', 'World'],
  },
  famicom: {
    name: 'Famicom',
    icon: '🟥',
    theme: 'theme-famicom',
    branding: 'Family Computer',
    imageRegions: ['Japan', 'Asia', 'World'],
  },
};

// ── Sample game data (hardcoded for design phase) ──
const SAMPLE_GAMES: SampleGame[] = [
  {
    id: '140',
    title: 'Super Mario Bros.',
    year: '1985',
    genre: 'Platform',
    developer: 'Nintendo EAD',
    publisher: 'Nintendo',
    maxPlayers: '2',
    desc: 'Do you have what it takes to save the Mushroom Princess? You\'ll have to think fast and move even faster to complete this quest! The Mushroom Princess is being held captive by the evil Koopa tribe of turtles. It\'s up to you to rescue her from the clutches of the Koopa King before time runs out.',
    fav: true,
    romPath: '/media/fat/games/NES/Super Mario Bros. (World).nes',
    images: {
      'North America': { front: 'e078d459-a166-47a2-9b5a-26a9fd7cd924.jpg', back: '829fc885-7b63-4e64-934d-104f5e939340.jpg' },
      'Japan': { front: '08fe10d4-66a3-4356-869c-44c9f9dc7bd0.jpg', back: '38f219b6-544a-4207-b6a0-73bba43665f1.jpg' },
    },
  },
  {
    id: '361',
    title: 'Mega Man 2',
    year: '1988',
    genre: 'Platform; Shooter',
    developer: 'Capcom',
    publisher: 'Capcom',
    maxPlayers: '1',
    desc: 'He\'s Back! And this time the evil Dr. Wily has created even more sinister robots to mount his attack. But as MegaMan, you\'ve also grown in power and ability. Can you save mankind from the evil Dr. Wily?',
    fav: false,
    romPath: '/media/fat/games/NES/Mega Man II (USA).nes',
    images: {
      'North America': { front: '49efb7ec-6ad8-4d35-aeeb-d1654dd6f8bb.png', back: '776e2e85-a032-44d2-b34c-2498dab9c90d.png' },
      'Japan': { front: '2dbfa696-0237-4b11-8f60-2c6321fc9de3.jpg', back: 'r2_1f3d28bd-e70e-47f8-8728-c335437078a0.png' },
    },
  },
  {
    id: '1258',
    title: 'Contra',
    year: '1988',
    genre: 'Platform; Shooter',
    developer: 'Konami',
    publisher: 'Konami',
    maxPlayers: '2',
    desc: 'The universe teeters on the brink of total annihilation at the hands of the vile alien warmonger, Red Falcon. Earth\'s only hope rests with you, a courageous member of the Special Forces elite commando squad.',
    fav: true,
    romPath: '/media/fat/games/NES/Contra (USA).nes',
    images: {
      'North America': { front: '3c70d940-5dfe-45ea-a957-9a8e6d2d00f8.jpg', back: '6bedbe54-d6db-4812-8222-c3fa87246572.jpg' },
      'Japan': { front: 'r2_0ebcca2a-9889-496f-b8c7-0c70e19aa394.jpg', back: '0e8fbded-44e6-438a-bb04-7a43c9104349.jpg' },
    },
  },
  {
    id: '135',
    title: 'Castlevania',
    year: '1986',
    genre: 'Platform',
    developer: 'Konami',
    publisher: 'Konami',
    maxPlayers: '1',
    desc: 'You\'re in for the longest night of your life. Ghosts, goblins, demons, wolves, bats — creatures lurking around every corner. As you discover the path, you\'ll find weapons and food to sustain your strength.',
    fav: false,
    romPath: '/media/fat/games/NES/Castlevania (USA) (Rev A).nes',
    images: {
      'North America': { front: '2aa41ec3-5ef4-4f43-b9dd-5150a3ef9f8b.jpg', back: '31aa0d67-0fa0-4111-98d1-d4aac78f69c5.jpg' },
      'Japan': { front: '88d781f3-1ae6-4e6b-955a-76ee55e916c0.png', back: '451a187c-ee0d-4678-9cb7-a27428466b29.jpg' },
    },
  },
  {
    id: '112',
    title: 'Super Mario Bros. 3',
    year: '1988',
    genre: 'Platform',
    developer: 'Nintendo EAD',
    publisher: 'Nintendo',
    maxPlayers: '2',
    desc: 'Fight monsters and mini-bosses, avoid ghosts and the burning sun. Make your way through water and quicksand. Dodge cannon balls and bullets and rescue the King\'s wand!',
    fav: true,
    romPath: '/media/fat/games/NES/Super Mario Bros. 3 (USA) (Rev A).nes',
    images: {
      'North America': { front: '500ae7d7-0c4a-41bf-a91c-747623e894a5.jpg', back: '25d45104-f557-4a8c-a963-590ff7cac0dc.jpg' },
      'Japan': { front: '46e903e2-fbea-4a3b-b8fa-eec4ec6d6a1d.jpg', back: 'aab1347e-1079-4047-8976-143f532b2239.jpg' },
    },
  },
  {
    id: '121',
    title: 'Kirby\'s Adventure',
    year: '1993',
    genre: 'Action; Platform',
    developer: 'HAL Laboratory',
    publisher: 'Nintendo',
    maxPlayers: '1',
    desc: 'What would Dream Land be without dreams? A nightmare! The Dream Spring, source of all dreams, has dried up. It\'s up to Kirby, the bombastic blimp, to battle King Dedede and restore sweet dreams.',
    fav: false,
    romPath: '/media/fat/games/NES/Kirby\'s Adventure (USA).nes',
    images: {
      'North America': { front: '0bdcf9f7-572e-4311-b600-6a7cabdf9a0a.jpg', back: 'e5d2fce6-9d3c-4f54-b79e-0d31229f6e7e.jpg' },
      'Japan': { front: 'bf593bb0-79a4-4fc5-ade9-6f5952d6056f.jpg', back: 'ad6b2812-ad60-48b9-8af7-1cd8713ccaaf.png' },
    },
  },
];

// ── Resolve best image for a region set ──
function resolveImage(
  game: SampleGame,
  regions: string[],
  side: 'front' | 'back',
  thumb?: boolean,
): string | undefined {
  let raw: string | undefined;
  for (const region of regions) {
    const img = game.images[region]?.[side];
    if (img) { raw = img; break; }
  }
  if (!raw) {
    for (const regionImgs of Object.values(game.images)) {
      if (regionImgs[side]) { raw = regionImgs[side]; break; }
    }
  }
  if (!raw) return undefined;
  const fullUrl = `${CDN}/${raw}`;
  if (thumb) {
    return `${THUMB_PROXY}/?url=${encodeURIComponent(fullUrl)}&w=${THUMB_WIDTH}&fit=contain&output=webp`;
  }
  return fullUrl;
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
function LazyImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
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
  const [selectedGame, setSelectedGame] = useState<SampleGame | null>(null);
  const [sheetTab, setSheetTab] = useState<SheetTab>('info');
  const [connected, setConnected] = useState(false);
  const [misterHost] = useState(() => localStorage.getItem('mister_host') || 'mister.local');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const api = useMemo(() => new WizzoApi(misterHost), [misterHost]);
  const wsRef = useRef<WebSocket | null>(null);
  const console_ = CONSOLES[activeConsole];

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

  // Filter games by search
  const filteredGames = SAMPLE_GAMES.filter(
    (g) =>
      !search ||
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.genre.toLowerCase().includes(search.toLowerCase()),
  );

  const switchConsole = useCallback((key: ConsoleKey) => {
    setActiveConsole(key);
  }, []);

  const openSheet = useCallback((game: SampleGame) => {
    setSelectedGame(game);
    setSheetTab('info');
  }, []);

  const closeSheet = useCallback(() => {
    setSelectedGame(null);
  }, []);

  return (
    <div className={`app ${console_.theme}`}>
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
            {(Object.keys(CONSOLES) as ConsoleKey[]).map((key) => (
              <button
                key={key}
                className={`console-pill ${activeConsole === key ? 'active' : ''}`}
                onClick={() => switchConsole(key)}
              >
                <span>{CONSOLES[key].icon}</span>
                <span>{CONSOLES[key].name}</span>
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
        <div className="section-label">Collection · {filteredGames.length} games</div>
        <div className="game-grid">
          {filteredGames.map((game) => {
            const frontUrl = resolveImage(game, console_.imageRegions, 'front', true);
            return (
              <div key={game.id} className="game-card" onClick={() => openSheet(game)}>
                <div className="card-art-wrap">
                  <LazyImage src={frontUrl} alt={game.title} className="card-art" />
                  {game.fav && <div className="card-fav">⭐</div>}
                </div>
                <div className="card-badge">
                  <div className="card-title">{game.title}</div>
                  <div className="card-year">{game.year}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Console Branding ── */}
        <div className="branding-bar">
          <div className="branding-line" />
          <span className="branding-text">{console_.branding}</span>
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
        const frontUrl = resolveImage(selectedGame, console_.imageRegions, 'front', true);
        const backUrl = resolveImage(selectedGame, console_.imageRegions, 'back', true);
        const bgUrl = resolveImage(selectedGame, console_.imageRegions, 'front', true);

        // Full-res URLs for gallery (no thumb proxy)
        const frontFull = resolveImage(selectedGame, console_.imageRegions, 'front');
        const backFull = resolveImage(selectedGame, console_.imageRegions, 'back');
        const gallerySlides: { src: string }[] = [];
        if (frontFull) gallerySlides.push({ src: frontFull });
        if (backFull) gallerySlides.push({ src: backFull });
        const frontGalleryIdx = 0;
        const backGalleryIdx = frontFull ? 1 : 0;
        return (
          <div className="sheet-overlay" onClick={closeSheet}>
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
              {/* Blurred background */}
              <div className="sheet-bg">
                {bgUrl && <img src={bgUrl} alt="" className="sheet-bg-img" />}
              </div>

              {/* Handle */}
              <div className="sheet-handle" />

              {/* Content */}
              <div className="sheet-content">
                {/* Title bar */}
                <div className="sheet-title-bar">
                  <div className="sheet-title">{selectedGame.title}</div>
                  <div className="sheet-subtitle">
                    {selectedGame.year} · {selectedGame.genre}
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
                        {frontUrl && <img src={frontUrl} alt={selectedGame.title} />}
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
                          <span className="sheet-info-value">{selectedGame.maxPlayers}</span>
                        </div>
                        <div className="sheet-info-row">
                          <span className="sheet-info-label">Genre</span>
                          <span className="sheet-info-value">{selectedGame.genre}</span>
                        </div>
                      </div>
                    </div>
                    <div className="sheet-desc">{selectedGame.desc}</div>
                  </div>
                )}

                {/* ── Library tab ── */}
                {sheetTab === 'library' && (
                  <div className="sheet-panel">
                    <div className="library-covers">
                      <div
                        className={`library-cover${frontUrl ? ' library-cover-clickable' : ''}`}
                        onClick={() => { if (frontUrl) { setGalleryIndex(frontGalleryIdx); setGalleryOpen(true); } }}
                      >
                        <div className="library-cover-label">Front</div>
                        <div className="library-cover-frame">
                          {frontUrl
                            ? <img src={frontUrl} alt="Front cover" />
                            : <div className="library-cover-empty">No image</div>}
                        </div>
                      </div>
                      <div
                        className={`library-cover${backUrl ? ' library-cover-clickable' : ''}`}
                        onClick={() => { if (backUrl) { setGalleryIndex(backGalleryIdx); setGalleryOpen(true); } }}
                      >
                        <div className="library-cover-label">Back</div>
                        <div className="library-cover-frame">
                          {backUrl
                            ? <img src={backUrl} alt="Back cover" />
                            : <div className="library-cover-empty">No image</div>}
                        </div>
                      </div>
                    </div>
                    <button className="sheet-btn sheet-btn-secondary library-manual-btn">
                      {Icons.book}
                      <span>View Manual</span>
                    </button>
                  </div>
                )}

                {/* ── Controls tab ── */}
                {sheetTab === 'controls' && (
                  <div className="sheet-panel">
                    {/* Primary action */}
                    <button
                      className="sheet-btn sheet-btn-primary ctrl-launch-btn"
                      onClick={() => api.launchGame(selectedGame.romPath)}
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
        slides={selectedGame ? (() => {
          const slides: { src: string }[] = [];
          const f = resolveImage(selectedGame, console_.imageRegions, 'front');
          const b = resolveImage(selectedGame, console_.imageRegions, 'back');
          if (f) slides.push({ src: f });
          if (b) slides.push({ src: b });
          return slides;
        })() : []}
      />
    </div>
  );
}
