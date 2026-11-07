import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { loadCollectionGames } from '../../services/launchbox';
import { useCollectionState } from '../../state/collectionState';
import { getCollectionPreviewIds } from '../collection/collectionPreview';
import { OwnedGamePage } from './OwnedGamePage';

export function OwnedGameRoute() {
    const { gameId } = useParams();
    const location = useLocation();
    const consoleKey = useCollectionState(state => state.activeConsole);
    const owned = useCollectionState(state => Boolean(gameId && state.collectionIds.includes(gameId)));
    const preview = import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === '1';
    const backTo = '/collection' + location.search;

    if (!gameId || (!owned && !(preview && getCollectionPreviewIds(consoleKey).includes(gameId)))) {
        return <Navigate to={backTo} replace />;
    }

    const state = location.state as { game?: LaunchBoxGame; consoleKey?: ConsoleKey } | null;
    const initialGame = state?.consoleKey === consoleKey && state.game?.id === gameId ? state.game : undefined;
    return <OwnedGameLoader key={JSON.stringify([consoleKey, gameId, location.key])}
        gameId={gameId} consoleKey={consoleKey} initialGame={initialGame} backTo={backTo} />;
}

function OwnedGameLoader({ gameId, consoleKey, initialGame, backTo }: {
    gameId: string;
    consoleKey: ConsoleKey;
    initialGame?: LaunchBoxGame;
    backTo: string;
}) {
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ game?: LaunchBoxGame; error?: true }>();

    useEffect(() => {
        let cancelled = false;
        loadCollectionGames(consoleKey, [gameId], { requireCatalog: true }).then(([game]) => {
            if (!cancelled) setResult({ game });
        }).catch(() => {
            if (!cancelled) setResult({ error: true });
        });
        return () => { cancelled = true; };
    }, [attempt, consoleKey, gameId]);

    const game = result ? result.game : initialGame;
    if (game) return <OwnedGamePage selectedGame={game} onClose={() => navigate(backTo, { replace: true })} />;
    if (result && !result.error) return <Navigate to={backTo} replace />;

    return <main className="page-layout">
        <Link to={backTo} replace>Back to collection</Link>
        {result?.error ? <>
            <p role="alert">Could not load this game.</p>
            <button onClick={() => { setResult(undefined); setAttempt(value => value + 1); }}>Retry</button>
        </> : <p role="status">Loading game…</p>}
    </main>;
}
