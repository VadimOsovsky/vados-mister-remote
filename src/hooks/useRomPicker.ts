import { useCallback, useState } from 'react';
import type { ConsoleKey, PlatformDef, SSGame } from '../types';
import type { WizzoApi, WizzoGameSearchResult } from '../services/wizzoApi';
import { getRomMapping, setRomMapping } from '../lib/storage';

export function useRomPicker(api: WizzoApi, platform: PlatformDef, selectedGame: SSGame | null, activeConsole: ConsoleKey) {
    const [romPickerOpen, setRomPickerOpen] = useState(false);
    const [romSearchQuery, setRomSearchQuery] = useState('');
    const [romSearchResults, setRomSearchResults] = useState<WizzoGameSearchResult[]>([]);
    const [romSearchLoading, setRomSearchLoading] = useState(false);
    const [romSearchError, setRomSearchError] = useState<string | null>(null);

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
            try {
                const response = await api.searchGames(query, platform.wizzoSystemId);
                const results = response.data ?? [];
                setRomSearchResults(results);
                setRomSearchError(results.length ? null : 'No ROMs found. Try a different search term.');
                return;
            } catch {
                // Index likely doesn't exist — generate and poll below
            }

            setRomSearchError('Game index not found. Generating...');
            try { await api.generateIndex(); } catch { /* ok */ }

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

    return {
        romPickerOpen, romSearchQuery, setRomSearchQuery,
        romSearchResults, romSearchLoading, romSearchError,
        openRomPicker, closeRomPicker, searchRoms, selectRom,
        handleLaunchGame,
    };
}
