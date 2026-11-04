import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ConsoleKey, LaunchBoxGame } from '../types';
import { loadCollectionGames, searchGames } from '../services/launchbox';
import { useAppContext } from '../AppContext';
import { getRecentGames } from '../lib/recentGames';

// Temporary local preview using real LaunchBox IDs, without writing ownership.
const PREVIEW_IDS = {
    nes: ['135', '121', '361', '123', '112', '113'],
    fds: ['90335', '90377', '91920'],
};

export function useCollection(activeConsole: ConsoleKey) {
    const { collectionIds } = useAppContext();
    const [params] = useSearchParams();
    const preview = import.meta.env.DEV && params.get('preview') === '1';
    const displayedIds = useMemo(() => {
        if (!preview) return collectionIds;
        return [...new Set([...collectionIds, ...PREVIEW_IDS[activeConsole === 'fds' ? 'fds' : 'nes']])];
    }, [activeConsole, collectionIds, preview]);
    const [games, setGames] = useState<LaunchBoxGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching requires loading state toggle
        setLoading(true);
        loadCollectionGames(activeConsole, displayedIds).then(data => {
            if (!cancelled) {
                setGames(data);
                setLoadError(false);
            }
        }).catch(() => {
            if (!cancelled) {
                setGames([]);
                setLoadError(true);
            }
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [activeConsole, displayedIds]);

    const filteredGames = useMemo(() => search ? searchGames(games, search) : games, [games, search]);

    const history = getRecentGames(activeConsole);
    let recentGames = history.flatMap(entry => {
        const game = games.find(candidate => candidate.id === entry.gameId);
        return game ? [{ game, launchedAt: entry.launchedAt }] : [];
    });

    // FDS is the preview example of a shelf without recent games.
    const mockRecent = preview && activeConsole !== 'fds' && !recentGames.length;
    if (mockRecent) {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const previewTimes = [now.getTime(), now.getTime() - 3 * 3_600_000, yesterday.getTime()];
        recentGames = ['112', '121', '135'].flatMap((id, index) => {
            const game = games.find(candidate => candidate.id === id);
            return game ? [{ game, launchedAt: previewTimes[index] }] : [];
        });
    }

    return { recentGames, mockRecent, loading, loadError, preview, search, setSearch, filteredGames };
}
