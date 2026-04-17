import { useCallback, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router';

import { PLATFORMS } from './constants';
import type { ConsoleKey } from './types';
import { readAuth, readHost } from './lib/storage';
import { GridIcon, StoreIcon, SettingsIcon } from './lib/icons';
import { initApi } from './services/screenscraper';
import { useConnection } from './hooks/useConnection';
import { useGameSheet } from './hooks/useGameSheet';
import { AppContext } from './AppContext';
import { TabBar } from './kit/TabBar/TabBar';
import { CollectionPage } from './features/collection/CollectionPage';
import { StorePage } from './features/store/StorePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { GameSheet } from './features/game-sheet/GameSheet';

import './styles/themes.css';
import './App.css';

// Init ScreenScraper API on load
{
    const { login, password } = readAuth();
    if (login && password) initApi(login, password);
}

const TAB_ITEMS = [
    { to: '/collection', icon: GridIcon, label: 'Collection' },
    { to: '/store', icon: StoreIcon, label: 'Store' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
];

export default function MisterRemote() {
    const [activeConsole, setActiveConsole] = useState<ConsoleKey>('nes_ntsc');
    const [misterHost, setMisterHost] = useState(readHost);
    const { connected, api } = useConnection(misterHost);
    const platform = PLATFORMS[activeConsole];

    const sheet = useGameSheet();

    const switchConsole = useCallback((key: ConsoleKey) => {
        setActiveConsole(key);
    }, []);

    return (
        <AppContext value={{
            activeConsole, setActiveConsole: switchConsole,
            platform, api, connected,
            misterHost, setMisterHost,
        }}>
            <div className={`app ${platform.theme}`}>
                <div className="app-content">
                    <Routes>
                        <Route path="/collection" element={<CollectionPage onSelectGame={sheet.openSheet} />} />
                        <Route path="/store" element={<StorePage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/collection" replace />} />
                    </Routes>
                </div>

                <TabBar items={TAB_ITEMS} />

                <GameSheet
                    selectedGame={sheet.selectedGame}
                    sheetTab={sheet.sheetTab}
                    setSheetTab={sheet.setSheetTab}
                    galleryOpen={sheet.galleryOpen}
                    setGalleryOpen={sheet.setGalleryOpen}
                    galleryIndex={sheet.galleryIndex}
                    setGalleryIndex={sheet.setGalleryIndex}
                    onClose={sheet.closeSheet}
                />
            </div>
        </AppContext>
    );
}
