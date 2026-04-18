import { useEffect, useState } from 'react';
import type { ConsoleKey, LaunchBoxGame } from '../types';
import { loadCollectionGames, searchGames } from '../services/launchbox';

export function useCollection(activeConsole: ConsoleKey) {
    const [games, setGames] = useState<LaunchBoxGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        loadCollectionGames(activeConsole).then(data => {
            if (!cancelled) setGames(data);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [activeConsole]);

    const filteredGames = search ? searchGames(games, search) : games;

    return { games, loading, search, setSearch, filteredGames };
}
