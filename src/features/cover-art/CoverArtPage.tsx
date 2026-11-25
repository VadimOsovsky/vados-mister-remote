import { useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useCollection } from '../../hooks/useCollection';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { getDisplayGameOverrides } from '../../lib/storage';
import {
    getImageUrl,
    resolveImages,
    resolveScreenshots,
    resolveTitle,
} from '../../services/launchbox';
import {
    getPreviewCover,
    getPreviewScreenshot,
} from '../collection/previewCovers';
import { mountCoverEditor } from './editor.js';
import type { CoverGame } from './editor.js';
import template from './editor.html?raw';
import './CoverArtEditor.css';

export function CoverArtPage() {
    const { gameId } = useParams();
    const consoleKey = useCollectionState((state) => state.activeConsole);
    const platform = usePlatform();
    const { filteredGames, loading, loadError, preview } =
        useCollection(consoleKey);
    const collectionIds = useCollectionState((state) => state.collectionIds);
    const games = useMemo<CoverGame[]>(
        () =>
            filteredGames
                .filter((game) => game.id === gameId)
                .map((game) => {
                    const overrides = getDisplayGameOverrides(
                        game.id,
                        consoleKey,
                    );
                    const images = resolveImages(game, platform.imageRegions);
                    const screenshot = resolveScreenshots(game)[0];
                    const clearLogo =
                        images.clearLogo ||
                        Object.values(game.images).find(
                            (image) => image.clearLogo,
                        )?.clearLogo;
                    const title =
                        overrides.title ||
                        resolveTitle(game, platform.nameRegions);
                    return {
                        id: consoleKey + ':' + game.id,
                        title,
                        year: game.year,
                        description:
                            game.desc.length > 180
                                ? game.desc
                                      .slice(0, 177)
                                      .replace(/\s+\S*$/, '') + '…'
                                : game.desc,
                        art:
                            overrides.boxFrontUrl ||
                            (preview
                                ? getPreviewCover(consoleKey, game.id)
                                : '') ||
                            (images.front ? getImageUrl(images.front) : ''),
                        screen:
                            (preview ? getPreviewScreenshot(game.id) : '') ||
                            (screenshot ? getImageUrl(screenshot) : ''),
                        gameLogo: clearLogo
                            ? clearLogo.startsWith('r2_')
                                ? 'https://gamesdb-images.launchbox.gg/' +
                                  clearLogo
                                : getImageUrl(clearLogo)
                            : undefined,
                        manual:
                            overrides.webManualUrl ||
                            overrides.manualUrl ||
                            undefined,
                    };
                }),
        [consoleKey, filteredGames, platform, preview, gameId],
    );

    const backTo =
        '/collection/game/' +
        encodeURIComponent(gameId || '') +
        (preview ? '?preview=1' : '');
    if (
        platform.lbPlatform !== 'nes' ||
        !gameId ||
        (!preview && !collectionIds.includes(gameId))
    )
        return <Navigate to="/collection" replace />;

    return (
        <main className="page-layout">
            <header className="cover-art-route-header">
                <Link to={backTo}>← Game library</Link>
                <strong>Cover Art</strong>
            </header>
            {loading ? (
                <p role="status">Loading your games…</p>
            ) : loadError ? (
                <p role="alert">
                    Could not load your games. Return to the library and try
                    again.
                </p>
            ) : games.length ? (
                <CoverArtEditor
                    key={consoleKey}
                    games={games}
                    initialGameId={consoleKey + ':' + gameId}
                />
            ) : (
                <p>Add a game to your library to create its cover art.</p>
            )}
        </main>
    );
}

function CoverArtEditor({
    games,
    initialGameId,
}: {
    games: CoverGame[];
    initialGameId?: string;
}) {
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const element = root.current;
        if (!element) return;
        element.innerHTML = template.replace('src="/cover-art/', `src="${import.meta.env.BASE_URL}cover-art/`);
        const unmount = mountCoverEditor(element, games, initialGameId);
        return () => {
            unmount();
            element.replaceChildren();
        };
    }, [games, initialGameId]);
    return <div ref={root} className="cover-art-editor" />;
}
