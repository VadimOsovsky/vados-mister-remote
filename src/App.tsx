import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router';

import type { LaunchBoxGame } from './types';
import { WalletFeedback } from './features/store/WalletFeedback';
import { GridIcon, StoreIcon, RemoteIcon, SettingsIcon } from './lib/icons';
import { useConnection } from './hooks/useConnection';
import { useKeepScreenAwake } from './hooks/useKeepScreenAwake';
import { useNowPlaying } from './hooks/useNowPlaying';
import { useVisualViewport } from './hooks/useVisualViewport';
import { useFocusedFieldScroll } from './hooks/useFocusedFieldScroll';
import { useCollectionState, usePlatform } from './state/collectionState';
import { useMisterState } from './state/misterState';
import { TabBar } from './kit/TabBar/TabBar';
import { CollectionPage } from './features/collection/CollectionPage';
import { StorePage } from './features/store/StorePage';
import { StoreGamePage } from './features/store/StoreGamePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { RemotePage } from './features/remote/RemotePage';
import { OwnedGameRoute } from './features/game-sheet/OwnedGameRoute';
import { MisterOfflinePage } from './kit/MisterOfflinePage';
import { hasSharedSnapshot, isSharedStorageReady, setSharedStorageOnline, subscribeToSync, syncSharedStorage } from './lib/sharedStorage';

import './styles/themes.css';
import './App.css';
import './styles/playroom.css';

const CoverArtPage = lazy(() => import('./features/cover-art/CoverArtPage').then(module => ({ default: module.CoverArtPage })));

const TAB_ITEMS = [
    { to: '/collection', icon: GridIcon, label: 'Collection' },
    { to: '/store', icon: StoreIcon, label: 'Store' },
    { to: '/remote', icon: RemoteIcon, label: 'Remote' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
];

function MisterConnection() {
    const api = useMisterState(state => state.api);
    const connected = useConnection(api);
    useEffect(() => {
        setSharedStorageOnline(connected);
        if (!connected) return;
        const refresh = () => void syncSharedStorage(true);
        refresh();
        const interval = window.setInterval(refresh, 3000);
        window.addEventListener('focus', refresh);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refresh);
            setSharedStorageOnline(false);
        };
    }, [api, connected]);
    const nowPlaying = useNowPlaying(api, connected);
    useEffect(() => {
        useMisterState.setState(state => state.api === api ? { connected, nowPlaying } : state);
    }, [api, connected, nowPlaying]);
    return null;
}

function WalletEffects() {
    const connected = useMisterState(state => state.connected);
    const storageReady = useSyncExternalStore(subscribeToSync, isSharedStorageReady);
    const economyDisabled = useCollectionState(state => state.economyDisabled);
    const visit = useCollectionState(state => state.visit);
    const notice = useCollectionState(state => state.walletNotice);
    const completion = useCollectionState(state => state.completion);
    const dismissCompletion = useCollectionState(state => state.dismissCompletion);

    useEffect(() => {
        if (!connected || !storageReady) return;
        const check = () => {
            if (document.visibilityState !== 'hidden') visit();
        };
        check();
        const timer = window.setInterval(check, 30_000);
        window.addEventListener('focus', check);
        document.addEventListener('visibilitychange', check);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', check);
            document.removeEventListener('visibilitychange', check);
        };
    }, [connected, storageReady, economyDisabled, visit]);

    return economyDisabled ? null : <WalletFeedback notice={notice} completion={completion} onDismiss={dismissCompletion} />;
}

export default function MisterRemote() {
    const screenAwake = useKeepScreenAwake();
    useVisualViewport();
    useFocusedFieldScroll();
    const platform = usePlatform();
    const activeConsole = useCollectionState(state => state.activeConsole);
    const location = useLocation();
    const navigate = useNavigate();
    const connected = useMisterState(state => state.connected);
    const storageReady = useSyncExternalStore(subscribeToSync, isSharedStorageReady);
    const preview = import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === '1';
    const cachedCollection = useSyncExternalStore(subscribeToSync, hasSharedSnapshot);
    const collectionAvailable = preview || cachedCollection || (connected && storageReady);
    const offlineCollection = <MisterOfflinePage screen="collection" />;
    const isGamePage = (collectionAvailable && location.pathname.startsWith('/collection/game/')) || location.pathname.startsWith('/store/game/');

    function openGame(game: LaunchBoxGame) {
        navigate('/collection/game/' + encodeURIComponent(game.id) + location.search, {
            state: { game, consoleKey: activeConsole, fromCollection: true },
        });
    }

    useEffect(() => {
        let pressed: HTMLElement | null = null;
        const release = () => {
            pressed?.classList.remove('is-key-pressed');
            pressed = null;
        };
        const press = (event: KeyboardEvent) => {
            if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
            if (!(event.target instanceof HTMLElement)) return;
            if (!event.target.matches('button:not(:disabled), a[href]')) return;
            if (event.key === ' ' && event.target.matches('a')) return;
            release();
            pressed = event.target;
            pressed.classList.add('is-key-pressed');
        };
        document.addEventListener('keydown', press);
        document.addEventListener('keyup', release);
        document.addEventListener('focusout', release);
        window.addEventListener('blur', release);
        return () => {
            release();
            document.removeEventListener('keydown', press);
            document.removeEventListener('keyup', release);
            document.removeEventListener('focusout', release);
            window.removeEventListener('blur', release);
        };
    }, []);

    // Sync theme class onto <body> so portals (vaul Drawer, etc.) inherit CSS variables
    useEffect(() => {
        document.body.classList.add(platform.theme);
        return () => { document.body.classList.remove(platform.theme); };
    }, [platform.theme]);

    return (
        <>
            <MisterConnection />
            <WalletEffects />
            <div className={`app ${platform.theme}`}>
                <div className={isGamePage ? "app-content owned-game-layout" : "app-content"}>
                    <Routes>
                        <Route path="/collection" element={collectionAvailable ? <CollectionPage onSelectGame={openGame} /> : offlineCollection} />
                        <Route path="/collection/game/:gameId/cover-art" element={preview || (connected && storageReady) ? <Suspense fallback={<p role="status">Loading editor…</p>}><CoverArtPage /></Suspense> : offlineCollection} />
                        <Route path="/collection/game/:gameId" element={collectionAvailable ? <OwnedGameRoute /> : offlineCollection} />
                        <Route path="/store" element={<StorePage />} />
                        <Route path="/store/game/:gameId" element={<StoreGamePage />} />
                        <Route path="/remote" element={connected || preview ? <RemotePage /> : <MisterOfflinePage screen="remote" />} />
                        <Route path="/settings" element={<SettingsPage screenAwake={screenAwake} />} />
                        <Route path="*" element={<Navigate to="/collection" replace />} />
                    </Routes>
                </div>

                {!isGamePage && <TabBar items={TAB_ITEMS} search={preview ? '?preview=1' : ''} />}
            </div>
        </>
    );
}
