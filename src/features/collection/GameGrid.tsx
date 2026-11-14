import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { useCollectionState } from '../../state/collectionState';
import { useIsGamePlaying } from '../../state/misterState';
import { FavoriteBookmark } from './FavoriteBookmark';
import { LazyImage } from '../../kit/LazyImage';
import { getImageUrl, resolveImages, resolveTitle } from '../../services/launchbox';
import { PLATFORMS } from '../../constants';
import { getDisplayGameOverrides, getSaveSlots, getGameSaveKey } from '../../lib/storage';
import { getPreviewCover } from './previewCovers';
import './GameGrid.css';

const PAGE_SIZE = 50;
const shelfBreakpoints = ['(max-width: 520px)', '(max-width: 900px)', '(max-width: 1100px)'];

function subscribeShelfWidth(callback: () => void) {
    const queries = shelfBreakpoints.map(query => window.matchMedia(query));
    queries.forEach(query => query.addEventListener('change', callback));
    return () => queries.forEach(query => query.removeEventListener('change', callback));
}

function getShelfColumns() {
    const index = shelfBreakpoints.findIndex(query => window.matchMedia(query).matches);
    return index === -1 ? 6 : index + 2;
}

export function GameCard({ game, regions, activeConsole, onSelect, preview, recent }: {
    game: LaunchBoxGame;
    regions: string[];
    activeConsole: ConsoleKey;
    onSelect: (game: LaunchBoxGame) => void;
    recent?: { selected: boolean; time: ReactNode; mockSaves?: number };
    preview?: boolean;
}) {
    const beatenIds = useCollectionState(state => state.beatenIds);
    const favoriteIds = useCollectionState(state => state.favoriteIds);
    const playing = useIsGamePlaying(game.id, activeConsole);
    const overrides = getDisplayGameOverrides(game.id, activeConsole);
    const images = resolveImages(game, regions);
    const displayTitle = overrides.title || resolveTitle(game, PLATFORMS[activeConsole].nameRegions);
    const localCover = preview ? getPreviewCover(activeConsole, game.id) : undefined;
    const frontSrc = overrides.boxFrontUrl || localCover || (images.front ? getImageUrl(images.front, 300) : undefined);
    const directCover = images.front ? getImageUrl(images.front) : undefined;
    const coverScale = PLATFORMS[activeConsole].coverScale;
    const slots = getSaveSlots(getGameSaveKey(game.id, activeConsole));
    const playerCount = game.maxPlayers.trim();
    const isBeaten = beatenIds.includes(game.id) || (preview && game.id === '112');
    return (
        <button type="button" aria-label={`${recent ? `Open ${displayTitle}` : displayTitle}${isBeaten ? ' · Completed' : ''}${playing ? ' · Now playing' : ''}`} aria-pressed={recent?.selected}
            className={`game-card${isBeaten ? ' beaten' : ''}`}
            onClick={() => onSelect(game)}
        >
            <span className="card-frame">
                <span className="card-art-wrap">
                    <LazyImage src={frontSrc} fallbackSrc={directCover} alt="" className="card-art"
                        style={coverScale === undefined ? undefined : { scale: coverScale }} />
                    {favoriteIds.includes(game.id) && <FavoriteBookmark />}
                    {isBeaten && <span className="card-beaten" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M6 3h12v2h3a1 1 0 0 1 1 1v2a6 6 0 0 1-5.3 6A6 6 0 0 1 13 16v3h3a2 2 0 0 1 2 2H6a2 2 0 0 1 2-2h3v-3a6 6 0 0 1-3.7-2A6 6 0 0 1 2 8V6a1 1 0 0 1 1-1h3V3Zm0 4H4v1a4 4 0 0 0 2.4 3.7A6 6 0 0 1 6 10V7Zm12 0v3a6 6 0 0 1-.4 1.7A4 4 0 0 0 20 8V7h-2Zm-6-1-1 2.1-2.3.3 1.7 1.7-.4 2.3 2-1.1 2 1.1-.4-2.3 1.7-1.7-2.3-.3L12 6Z" />
                        </svg>
                    </span>}
                </span>
                <span className="card-status">
                    <span className="save-dots" role="img" aria-label={(recent?.mockSaves ?? slots.filter(Boolean).length) + ' of 4 save slots used'}>
                        {slots.map((slot, index) => <i key={index} className={slot?.beaten ? 'complete' : slot || index < (recent?.mockSaves ?? 0) ? 'used' : ''} />)}
                    </span>
                    <span className="card-player-status">
                        {playing && <span className="now-playing-dot" aria-hidden="true" />}
                        {/^[1-9]\d*$/.test(playerCount) && <span className="player-badge">{playerCount}P</span>}
                    </span>
                </span>
            </span>
            <span className="card-badge">
                <span className="card-title">{displayTitle}</span>
                <span className="card-year">{recent ? recent.time : [game.year, game.publisher].filter(Boolean).join(' · ')}</span>
            </span>
        </button>
    );
}

export function GameGrid({ games, regions, activeConsole, onSelect, scrollRef, renderStoreCard, preview, restore }: {
    games: LaunchBoxGame[];
    regions: string[];
    activeConsole: ConsoleKey;
    onSelect: (game: LaunchBoxGame) => void;
    scrollRef?: RefObject<HTMLDivElement | null>;
    renderStoreCard?: (game: LaunchBoxGame) => ReactNode;
    preview?: boolean;
    restore?: { gameIndex: number; rowOffset: number };
}) {
    const [visibleCount, setVisibleCount] = useState(() =>
        restore ? Math.ceil((restore.gameIndex + 1) / PAGE_SIZE) * PAGE_SIZE + PAGE_SIZE : PAGE_SIZE,
    );
    const previousGames = useRef(games);
    const restored = useRef(false);
    const gridRef = useRef<HTMLDivElement>(null);

    // Reset pagination when games list changes (console switch / search)
    useEffect(() => {
        if (previousGames.current === games) return;
        previousGames.current = games;
        setVisibleCount(PAGE_SIZE);
    }, [games]);

    const visibleGames = useMemo(
        () => games.slice(0, visibleCount),
        [games, visibleCount],
    );
    const shelfColumns = useSyncExternalStore(subscribeShelfWidth, getShelfColumns);
    const columns = renderStoreCard ? Math.min(shelfColumns, 4) : shelfColumns;
    const rowCount = Math.ceil(visibleGames.length / columns);

    const [measuredMargin, setScrollMargin] = useState<number>();
    const scrollMargin = measuredMargin ?? 0;
    useLayoutEffect(() => {
        const grid = gridRef.current;
        const scroller = scrollRef?.current;
        if (!grid || !scroller) return;
        const measure = () => setScrollMargin(
            grid.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop + scroller.scrollTop,
        );
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(scroller);
        // The store grid is nested inside <main>; its intro is a sibling of
        // that ancestor, so measuring only the grid's siblings misses it.
        for (let element: Element | null = grid; element && element !== scroller; element = element.parentElement) {
            for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
                observer.observe(sibling);
            }
        }
        return () => observer.disconnect();
    }, [games, scrollRef]);

    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => scrollRef?.current ?? null,
        estimateSize: () => 200,
        overscan: 3,
        scrollMargin,
        scrollPaddingStart: restore?.rowOffset ?? 0,
    });

    useLayoutEffect(() => {
        if (!restore || restored.current || measuredMargin === undefined || !rowCount) return;
        restored.current = true;
        virtualizer.scrollToIndex(Math.floor(restore.gameIndex / columns), { align: 'start' });
    }, [restore, measuredMargin, rowCount, virtualizer, columns]);

    // Load more when scrolling near the end
    const virtualItems = virtualizer.getVirtualItems();
    const lastItemIndex = virtualItems[virtualItems.length - 1]?.index;

    useEffect(() => {
        if (lastItemIndex == null) return;
        if (lastItemIndex >= rowCount - 3 && visibleCount < games.length) {
            setVisibleCount(prev => Math.min(prev + PAGE_SIZE, games.length));
        }
    }, [lastItemIndex, rowCount, visibleCount, games.length]);

    return (
        <div
            ref={gridRef}
            className={renderStoreCard ? "game-grid shop-grid" : "game-grid shelf-grid"}
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualItems.map(virtualRow => {
                const startIndex = virtualRow.index * columns;
                return (
                    <div
                        key={virtualRow.key}
                        ref={virtualizer.measureElement}
                        data-index={virtualRow.index}
                        className="game-grid-row"
                        style={{
                            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                            transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                        }}
                    >
                        {Array.from({ length: columns }, (_, col) => {
                            const game = visibleGames[startIndex + col];
                            if (!game) return null;
                            if (renderStoreCard) return renderStoreCard(game);
                            return (
                                <GameCard
                                    key={game.id}
                                    game={game}
                                    regions={regions}
                                    activeConsole={activeConsole}
                                    onSelect={onSelect}
                                    preview={preview}
                                />
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
