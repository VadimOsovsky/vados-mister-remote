import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsoleKey, LaunchBoxGame, PlatformDef } from '../types';
import type { WizzoApi, WizzoGameSearchResult } from '../services/wizzoApi';
import { getRomMapping, getRomVersions, setRomMapping } from '../lib/storage';
import { CheatLaunchError } from '../services/gameCheats';
import { launchCollectionGame } from '../services/collectionLauncher';

export function useRomPicker(api: WizzoApi, platform: PlatformDef, selectedGame: LaunchBoxGame | null, activeConsole: ConsoleKey, onSelect?: (romPath: string) => void, searchEnabled = true) {
    const [romPickerOpen, setRomPickerOpen] = useState(false);
    const [romSearchQuery, setQuery] = useState('');
    const searchVersion = useRef(0);
    const [romSearchResults, setRomSearchResults] = useState<WizzoGameSearchResult[]>([]);
    const [romSearchLoading, setRomSearchLoading] = useState(false);
    const [romSearchError, setRomSearchError] = useState<string | null>(null);
    const clearRomSearchError = useCallback(() => setRomSearchError(null), []);

    const setRomSearchQuery = useCallback((query: string) => {
        searchVersion.current += 1;
        setQuery(query);
        setRomSearchResults([]);
        setRomSearchError(null);
        setRomSearchLoading(searchEnabled && Boolean(query.trim()));
    }, [searchEnabled]);

    const openRomPicker = useCallback((gameName: string) => {
        setRomSearchQuery(gameName);
        setRomPickerOpen(true);
    }, [setRomSearchQuery]);

    const closeRomPicker = useCallback(() => {
        searchVersion.current += 1;
        setRomPickerOpen(false);
        setRomSearchLoading(false);
        setRomSearchResults([]);
        setRomSearchError(null);
    }, []);

    const searchRoms = useCallback(async (query: string) => {
        if (!query.trim()) {
            setRomSearchResults([]);
            return;
        }
        const version = ++searchVersion.current;
        const isCurrent = () => version === searchVersion.current;
        setRomSearchLoading(true);
        setRomSearchError(null);
        setRomSearchResults([]);

        try {
            try {
                const response = await api.searchGames(query, platform.wizzoSystemId);
                if (!isCurrent()) return;
                const results = response.data ?? [];
                setRomSearchResults(results);
                setRomSearchError(results.length ? null : 'No ROMs found. Try a different search term.');
                return;
            } catch {
                // Index likely doesn't exist — generate and poll below
            }

            if (!isCurrent()) return;
            setRomSearchError('Game index not found. Generating...');
            try { await api.generateIndex(); } catch { /* ok */ }

            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 3000));
                if (!isCurrent()) return;
                try {
                    const response = await api.searchGames(query, platform.wizzoSystemId);
                    if (!isCurrent()) return;
                    const results = response.data ?? [];
                    setRomSearchResults(results);
                    setRomSearchError(results.length ? null : 'No ROMs found. Try a different search term.');
                    return;
                } catch {
                    if (!isCurrent()) return;
                    setRomSearchError(`Generating game index... (${i + 1}/40)`);
                }
            }

            setRomSearchError('Index generation timed out. Try again later.');
        } finally {
            if (isCurrent()) setRomSearchLoading(false);
        }
    }, [api, platform.wizzoSystemId]);

    // Debounced auto-search on query change
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    useEffect(() => {
        if (!romPickerOpen || !searchEnabled) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchRoms(romSearchQuery);
        }, 500);
        return () => {
            searchVersion.current += 1;
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [romSearchQuery, romPickerOpen, searchRoms, searchEnabled]);

    const selectRom = useCallback(async (result: WizzoGameSearchResult) => {
        if (!selectedGame) return;
        closeRomPicker();
        if (onSelect) {
            onSelect(result.path);
        } else {
            setRomMapping(selectedGame.id, activeConsole, result.path);
            try {
                await launchCollectionGame(api, activeConsole, selectedGame.id, result.path);
            } catch (error) {
                if (error instanceof CheatLaunchError) setRomSearchError(error.message);
                else openRomPicker(selectedGame.title);
            }
        }
    }, [selectedGame, activeConsole, api, openRomPicker, closeRomPicker, onSelect]);

    const handleLaunchGame = useCallback(async () => {
        if (!selectedGame) return;
        const cachedPath = getRomMapping(selectedGame.id, activeConsole);
        if (cachedPath) {
            try {
                await launchCollectionGame(api, activeConsole, selectedGame.id, cachedPath);
                return;
            } catch (error) {
                if (error instanceof CheatLaunchError) {
                    setRomSearchError(error.message);
                    return;
                }
                // Never replace the original mapping after a translated ROM fails.
                if (getRomVersions(selectedGame.id, activeConsole).selected) {
                    setRomSearchError('Could not launch this translation. Check the ROM on MiSTer or choose another language.');
                    return;
                }
                // Cached original path failed — fall through to picker
            }
        }
        openRomPicker(selectedGame.title);
    }, [selectedGame, activeConsole, api, openRomPicker]);

    return {
        romPickerOpen, romSearchQuery, setRomSearchQuery,
        romSearchResults, romSearchLoading, romSearchError,
        openRomPicker, closeRomPicker, searchRoms, selectRom,
        handleLaunchGame, clearRomSearchError,
    };
}
