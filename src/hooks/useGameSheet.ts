import { useCallback, useState } from 'react';
import type { LaunchBoxGame } from '../types';

export type SheetTab = 'main' | 'library' | 'controls';

export function useGameSheet() {
    const [selectedGame, setSelectedGame] = useState<LaunchBoxGame | null>(null);
    const [sheetTab, setSheetTab] = useState<SheetTab>('main');
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);

    const openSheet = useCallback((game: LaunchBoxGame) => {
        setSelectedGame(game);
        setSheetTab('main');
    }, []);

    const closeSheet = useCallback(() => {
        setSelectedGame(null);
    }, []);

    return {
        selectedGame, sheetTab, setSheetTab,
        galleryOpen, setGalleryOpen,
        galleryIndex, setGalleryIndex,
        openSheet, closeSheet,
    };
}
