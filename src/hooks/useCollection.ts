import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ConsoleKey, LaunchBoxGame } from '../types';
import { loadCollectionGames, searchGames } from '../services/launchbox';
import { useCollectionState } from '../state/collectionState';
import { getRecentGames } from '../lib/recentGames';
import { readCollectionGameCache, writeCollectionGameCache } from '../lib/collectionGameCache';
import { PLATFORMS } from '../constants';

import { getCollectionPreviewIds } from '../features/collection/collectionPreview';

export function useCollection(activeConsole: ConsoleKey) {
    const collectionIds = useCollectionState(state => state.collectionIds);
    const [params] = useSearchParams();
    const preview = import.meta.env.DEV && params.get('preview') === '1';
    const displayedIds = useMemo(() => {
        if (!preview) return collectionIds;
        return [...new Set([...collectionIds, ...getCollectionPreviewIds(activeConsole)])];
    }, [activeConsole, collectionIds, preview]);
    const cachedGames = useMemo(() => readCollectionGameCache(activeConsole, displayedIds), [activeConsole, displayedIds]);
    const [result, setResult] = useState<{ consoleKey: ConsoleKey; ids: string[]; games?: LaunchBoxGame[] }>();
    const [search, setSearch] = useState('');
    const current = result?.consoleKey === activeConsole && result.ids === displayedIds ? result : undefined;
    const games = current?.games ?? cachedGames;
    const loading = !current && displayedIds.length > 0 && !games.length;
    const loadError = Boolean(current && !current.games && !games.length);

    useEffect(() => {
        let cancelled = false;
        loadCollectionGames(activeConsole, displayedIds, { requireCatalog: true }).then(data => {
            if (!cancelled) {
                if (!preview) writeCollectionGameCache(activeConsole, data);
                setResult({ consoleKey: activeConsole, ids: displayedIds, games: data });
            }
        }).catch(() => {
            if (!cancelled) setResult({ consoleKey: activeConsole, ids: displayedIds });
        });
        return () => { cancelled = true; };
    }, [activeConsole, displayedIds, preview]);

    const filteredGames = useMemo(() => search ? searchGames(games, search) : games, [games, search]);

    const history = getRecentGames(activeConsole);
    let recentGames = history.flatMap(entry => {
        const game = games.find(candidate => candidate.id === entry.gameId);
        return game ? [{ game, launchedAt: entry.launchedAt }] : [];
    });

    // FDS is the preview example of a shelf without recent games.
    const mockRecent = preview && PLATFORMS[activeConsole].lbPlatform !== 'fds' && !recentGames.length;
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
