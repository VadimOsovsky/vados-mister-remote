import { useEffect, useState } from 'react';
import type { ConsoleKey, LaunchBoxGame } from '../types';
import { loadCollectionGames, searchGames } from '../services/launchbox';
import { useAppContext } from '../AppContext';

export function useCollection(activeConsole: ConsoleKey) {
    const { collectionIds } = useAppContext();
    const [games, setGames] = useState<LaunchBoxGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching requires loading state toggle
        setLoading(true);
        loadCollectionGames(activeConsole, collectionIds).then(data => {
            if (!cancelled) setGames(data);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [activeConsole, collectionIds]);

    const filteredGames = search ? searchGames(games, search) : games;

    return { games, loading, search, setSearch, filteredGames };
}
