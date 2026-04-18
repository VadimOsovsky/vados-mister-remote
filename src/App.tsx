import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router';

import { PLATFORMS } from './constants';
import type { ConsoleKey } from './types';
import { readHost, getCollectionIds, addCollectionId, removeCollectionId } from './lib/storage';
import { GridIcon, StoreIcon, SettingsIcon } from './lib/icons';
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

    const [collectionIds, setCollectionIds] = useState<string[]>(() => getCollectionIds(activeConsole));

    useEffect(() => {
        setCollectionIds(getCollectionIds(activeConsole));
    }, [activeConsole]);

    const addToCollection = useCallback((gameId: string) => {
        setCollectionIds(addCollectionId(activeConsole, gameId));
    }, [activeConsole]);

    const removeFromCollection = useCallback((gameId: string) => {
        setCollectionIds(removeCollectionId(activeConsole, gameId));
    }, [activeConsole]);

    // Sync theme class onto <body> so portals (vaul Drawer, etc.) inherit CSS variables
    useEffect(() => {
        document.body.classList.add(platform.theme);
        return () => { document.body.classList.remove(platform.theme); };
    }, [platform.theme]);

    const switchConsole = useCallback((key: ConsoleKey) => {
        setActiveConsole(key);
    }, []);

    return (
        <AppContext value={{
            activeConsole, setActiveConsole: switchConsole,
            platform, api, connected,
            misterHost, setMisterHost,
            collectionIds, addToCollection, removeFromCollection,
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
                    editMode={sheet.editMode}
                    setEditMode={sheet.setEditMode}
                    onClose={sheet.closeSheet}
                />
            </div>
        </AppContext>
    );
}
