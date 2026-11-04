import { useEffect, useMemo, useState } from 'react';
import { PLATFORMS } from '../constants';
import type { ConsoleKey, LaunchBoxGame, SortMode } from '../types';
import { hasImageInRegions, loadPlatformGames, searchGames } from '../services/launchbox';
import { SORT_FNS } from '../services/sorting';
import { useAppContext } from '../AppContext';
import { readStoreSort, writeStoreSort } from '../lib/storage';
import { getStorePreviewIds } from '../features/store/storePreview';

export function useStore(activeConsole: ConsoleKey, preview = false) {
    const { collectionIds } = useAppContext();
    const [catalog, setCatalog] = useState<{ consoleKey: ConsoleKey; games: LaunchBoxGame[]; error?: boolean }>();
    const loading = catalog?.consoleKey !== activeConsole;
    const [search, setSearch] = useState('');
    const [sort, _setSort] = useState<SortMode>(() => readStoreSort() ?? 'popular');
    const setSort = (s: SortMode) => { _setSort(s); writeStoreSort(s); };

    const platform = PLATFORMS[activeConsole];

    useEffect(() => {
        let cancelled = false;
        loadPlatformGames(activeConsole).then(data => {
            if (!cancelled) setCatalog({ consoleKey: activeConsole, games: data });
        }).catch(() => {
            if (!cancelled) setCatalog({ consoleKey: activeConsole, games: [], error: true });
        });
        return () => { cancelled = true; };
    }, [activeConsole]);

    const filteredGames = useMemo(() => {
        if (loading || !catalog) return [];
        const { games } = catalog;
        if (preview) {
            const ordered = getStorePreviewIds(activeConsole).flatMap(id => games.filter(game => game.id === id));
            const sorted = sort === 'popular' ? ordered : ordered.sort(SORT_FNS[sort]);
            return search ? searchGames(sorted, search) : sorted;
        }
        const collectionSet = new Set(collectionIds);
        const regionFiltered = games
            .filter(g => hasImageInRegions(g, platform.imageRegions) && !collectionSet.has(g.id))
            .sort(SORT_FNS[sort]);
        return search ? searchGames(regionFiltered, search) : regionFiltered;
    }, [catalog, search, platform.imageRegions, sort, collectionIds, activeConsole, loading, preview]);

    return { loading, error: !loading && catalog?.error, search, setSearch, sort, setSort, filteredGames };
}
