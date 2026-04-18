import { useEffect, useMemo, useState } from 'react';
import { PLATFORMS } from '../constants';
import type { ConsoleKey, LaunchBoxGame, SortMode } from '../types';
import { hasImageInRegions, loadPlatformGames, searchGames } from '../services/launchbox';
import { SORT_FNS } from '../services/sorting';

export function useStore(activeConsole: ConsoleKey) {
    const [games, setGames] = useState<LaunchBoxGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortMode>('popular');

    const platform = PLATFORMS[activeConsole];

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching requires loading state toggle
        setLoading(true);
        loadPlatformGames(activeConsole).then(data => {
            if (!cancelled) setGames(data);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [activeConsole]);

    const filteredGames = useMemo(() => {
        console.log('VO: sort', sort)
        const regionFiltered = games
            .filter(g => hasImageInRegions(g, platform.imageRegions))
            .sort(SORT_FNS[sort]);
        return search ? searchGames(regionFiltered, search) : regionFiltered;
    }, [games, search, platform.imageRegions, sort]);

    return { loading, search, setSearch, sort, setSort, filteredGames };
}
