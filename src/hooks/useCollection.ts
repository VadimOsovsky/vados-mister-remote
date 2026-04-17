import { useEffect, useState } from 'react';
import type { ConsoleKey, SSGame } from '../types';
import { loadCollectionGames, searchLocal } from '../services/screenscraper';

export function useCollection(activeConsole: ConsoleKey) {
    const [games, setGames] = useState<SSGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching requires loading state toggle
        setLoading(true);
        loadCollectionGames(activeConsole).then(data => {
            if (!cancelled) setGames(data);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [activeConsole]);

    const filteredGames = search ? searchLocal(games, search) : games;

    return { games, loading, search, setSearch, filteredGames };
}
