import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router';

import { PLATFORMS } from './constants';
import type { ConsoleKey, LaunchBoxGame } from './types';
import { readHost, getCollectionIds, addCollectionId, removeCollectionId, getBeatenIds, addBeatenId, removeBeatenId, readActiveConsole, writeActiveConsole, getWalletBalance, setRomMapping, readEconomyDisabled, writeEconomyDisabled, getFavoriteIds, setFavorite } from './lib/storage';
import { visitWallet, rewardBeatenGame, spendWallet } from './lib/wallet';
import { WalletFeedback } from './features/store/WalletFeedback';
import { GridIcon, StoreIcon, RemoteIcon, SettingsIcon } from './lib/icons';
import { useConnection } from './hooks/useConnection';
import { useNowPlaying } from './hooks/useNowPlaying';
import { isRomPlaying } from './services/nowPlaying';
import { getRomMapping } from './lib/storage';
import { useVisualViewport } from './hooks/useVisualViewport';
import { useFocusedFieldScroll } from './hooks/useFocusedFieldScroll';
import { AppContext } from './AppContext';
import { TabBar } from './kit/TabBar/TabBar';
import { CollectionPage } from './features/collection/CollectionPage';
import { StorePage } from './features/store/StorePage';
import { StoreGamePage } from './features/store/StoreGamePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { RemotePage } from './features/remote/RemotePage';
import { OwnedGamePage } from './features/game-sheet/OwnedGamePage';

import './styles/themes.css';
import './App.css';
import './styles/playroom.css';

const TAB_ITEMS = [
    { to: '/collection', icon: GridIcon, label: 'Collection' },
    { to: '/store', icon: StoreIcon, label: 'Store' },
    { to: '/remote', icon: RemoteIcon, label: 'Remote' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
];

export default function MisterRemote() {
    useVisualViewport();
    useFocusedFieldScroll();
    const [activeConsole, setActiveConsole] = useState<ConsoleKey>(() => readActiveConsole() ?? 'nes_ntsc');
    const [misterHost, setMisterHost] = useState(readHost);
    const { connected, api } = useConnection(misterHost);
    const nowPlaying = useNowPlaying(api, connected);
    const isGamePlaying = useCallback((gameId: string, consoleKey: ConsoleKey) =>
        isRomPlaying(nowPlaying, getRomMapping(gameId, consoleKey), consoleKey), [nowPlaying]);
    const platform = PLATFORMS[activeConsole];

    const location = useLocation();
    const navigate = useNavigate();
    const isGamePage = location.pathname.startsWith('/collection/game/') || location.pathname.startsWith('/store/game/');

    const routeGame = (location.state as { game?: LaunchBoxGame } | null)?.game;

    function openGame(game: LaunchBoxGame) {
        navigate('/collection/game/' + encodeURIComponent(game.id) + location.search, { state: { game } });
    }

    function closeGame() {
        navigate('/collection' + location.search, { replace: true });
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

    const [collectionIds, setCollectionIds] = useState<string[]>(() => getCollectionIds(activeConsole));
    const [favoriteIds, setFavoriteIds] = useState(() => getFavoriteIds(activeConsole));
    const [beatenIds, setBeatenIds] = useState<string[]>(() => getBeatenIds(activeConsole));
    const [economyDisabled, updateEconomyDisabled] = useState(readEconomyDisabled);
    const [balance, setBalance] = useState(getWalletBalance);
    const [walletNotice, setWalletNotice] = useState<{ amount: number; id: number } | null>(null);
    const [completion, setCompletion] = useState<{ title: string; balance: number } | null>(null);

    function setEconomyDisabled(enabled: boolean) {
        writeEconomyDisabled(enabled);
        setWalletNotice(null);
        setCompletion(null);
        updateEconomyDisabled(enabled);
    }

    useEffect(() => {
        const check = () => {
            if (document.visibilityState === 'hidden') return;
            const visit = visitWallet();
            setBalance(visit.balance);
            if (visit.reward) setWalletNotice({ amount: visit.reward, id: Date.now() });
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
    }, [economyDisabled]);

    const addToCollection = useCallback((gameId: string) => {
        setCollectionIds(addCollectionId(activeConsole, gameId));
    }, [activeConsole]);

    const toggleFavorite = useCallback((gameId: string) => {
        const favorite = getFavoriteIds(activeConsole).includes(gameId);
        setFavoriteIds(setFavorite(activeConsole, gameId, !favorite));
    }, [activeConsole]);

    const removeFromCollection = useCallback((gameId: string) => {
        setCollectionIds(removeCollectionId(activeConsole, gameId));
        setFavoriteIds(setFavorite(activeConsole, gameId, false));
    }, [activeConsole]);

    const purchaseGame = useCallback((gameId: string, price: number, romPath: string) => {
        const currentBalance = getWalletBalance();
        const owned = getCollectionIds(activeConsole);
        if ((!economyDisabled && currentBalance < price) || owned.includes(gameId)) {
            setBalance(currentBalance);
            setCollectionIds(owned);
            return false;
        }
        const newBalance = economyDisabled ? currentBalance : spendWallet(price);
        if (newBalance === null) return false;
        setRomMapping(gameId, activeConsole, romPath);
        setBalance(newBalance);
        setCollectionIds(addCollectionId(activeConsole, gameId));
        if (!economyDisabled && price > 0) setWalletNotice({ amount: -price, id: Date.now() });
        return true;
    }, [activeConsole, economyDisabled]);

    const markAsBeaten = useCallback((gameId: string) => {
        setBeatenIds(addBeatenId(activeConsole, gameId));
        const result = rewardBeatenGame(gameId);
        setBalance(result.balance);
        if (result.reward) setCompletion({ title: routeGame?.title ?? 'Your game', balance: result.balance });
    }, [activeConsole, routeGame]);

    const unmarkAsBeaten = useCallback((gameId: string) => {
        setBeatenIds(removeBeatenId(activeConsole, gameId));
    }, [activeConsole]);

    // Sync theme class onto <body> so portals (vaul Drawer, etc.) inherit CSS variables
    useEffect(() => {
        document.body.classList.add(platform.theme);
        return () => { document.body.classList.remove(platform.theme); };
    }, [platform.theme]);

    const switchConsole = useCallback((key: ConsoleKey) => {
        setActiveConsole(key);
        setCollectionIds(getCollectionIds(key));
        setBeatenIds(getBeatenIds(key));
        setFavoriteIds(getFavoriteIds(key));
        writeActiveConsole(key);
    }, []);

    return (
        <AppContext value={{
            activeConsole, setActiveConsole: switchConsole,
            platform, api, connected, nowPlaying, isGamePlaying,
            misterHost, setMisterHost,
            collectionIds, addToCollection, removeFromCollection,
            favoriteIds, toggleFavorite,
            beatenIds, markAsBeaten, unmarkAsBeaten,
            balance, purchaseGame, economyDisabled, setEconomyDisabled,
        }}>
            {!economyDisabled && <WalletFeedback notice={walletNotice} completion={completion} onDismiss={() => setCompletion(null)} />}
            <div className={`app ${platform.theme}`}>
                <div className={isGamePage ? "app-content owned-game-layout" : "app-content"}>
                    <Routes>
                        <Route path="/collection" element={<CollectionPage onSelectGame={openGame} />} />
                        <Route path="/collection/game/:gameId" element={routeGame ? (
                            <OwnedGamePage
                                key={location.key}
                                selectedGame={routeGame}
                                onClose={closeGame}
                            />
                        ) : <Navigate to={'/collection' + location.search} replace />} />
                        <Route path="/store" element={<StorePage />} />
                        <Route path="/store/game/:gameId" element={<StoreGamePage />} />
                        <Route path="/remote" element={<RemotePage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/collection" replace />} />
                    </Routes>
                </div>

                {!isGamePage && <TabBar items={TAB_ITEMS} search={import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === '1' ? '?preview=1' : ''} />}
            </div>
        </AppContext>
    );
}
