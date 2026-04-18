import { useEffect, useMemo, useState } from 'react';
import { PLATFORMS } from '../constants';
import type { ConsoleKey, LaunchBoxGame } from '../types';
import { hasImageInRegions, loadPlatformGames, searchGames } from '../services/launchbox';

export function useStore(activeConsole: ConsoleKey) {
    const [games, setGames] = useState<LaunchBoxGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

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
        const regionFiltered = games.filter(g => hasImageInRegions(g, platform.imageRegions));
        return search ? searchGames(regionFiltered, search) : regionFiltered;
    }, [games, search, platform.imageRegions]);

    return { loading, search, setSearch, filteredGames };
}
