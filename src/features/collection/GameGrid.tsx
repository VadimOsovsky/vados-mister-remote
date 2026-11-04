import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { useAppContext } from '../../AppContext';
import { FavoriteBookmark } from './FavoriteBookmark';
import { LazyImage } from '../../kit/LazyImage';
import { getImageUrl, resolveImages, resolveTitle } from '../../services/launchbox';
import { PLATFORMS } from '../../constants';
import { getGameOverrides, getSaveSlots } from '../../lib/storage';
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
    const { beatenIds, favoriteIds } = useAppContext();
    const overrides = getGameOverrides(game.id, activeConsole);
    const images = resolveImages(game, regions);
    const displayTitle = overrides.title || resolveTitle(game, PLATFORMS[activeConsole].nameRegions);
    const localCover = preview ? getPreviewCover(activeConsole, game.id) : undefined;
    const frontSrc = overrides.boxFrontUrl || localCover || (images.front ? getImageUrl(images.front, 300) : undefined);
    const directCover = images.front ? getImageUrl(images.front) : undefined;
    const coverScale = PLATFORMS[activeConsole].coverScale;
    const slots = getSaveSlots(game.id);
    const playerCount = game.maxPlayers.trim();
    const isBeaten = beatenIds.includes(game.id);
    return (
        <button type="button" aria-label={recent ? `Open ${displayTitle}` : displayTitle} aria-pressed={recent?.selected}
            className={`game-card${isBeaten ? ' beaten' : ''}`}
            onClick={() => onSelect(game)}
        >
            <span className="card-frame">
                <span className="card-art-wrap">
                    <LazyImage src={frontSrc} fallbackSrc={directCover} alt="" className="card-art"
                        style={coverScale === undefined ? undefined : { scale: coverScale }} />
                    {favoriteIds.includes(game.id) && <FavoriteBookmark />}
                    {isBeaten && <span className="card-beaten">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>
                    </span>}
                </span>
                <span className="card-status">
                    <span className="save-dots" role="img" aria-label={(recent?.mockSaves ?? slots.filter(Boolean).length) + ' of 4 save slots used'}>
                        {slots.map((slot, index) => <i key={index} className={slot?.beaten ? 'complete' : slot || index < (recent?.mockSaves ?? 0) ? 'used' : ''} />)}
                    </span>
                    {/^[1-9]\d*$/.test(playerCount) && <span className="player-badge">{playerCount}P</span>}
                </span>
            </span>
            <span className="card-badge">
                <span className="card-title">{displayTitle}</span>
                <span className="card-year">{recent ? recent.time : [game.year, game.publisher].filter(Boolean).join(' · ')}</span>
            </span>
        </button>
    );
}

export function GameGrid({ games, regions, activeConsole, onSelect, scrollRef, renderStoreCard, preview }: {
    games: LaunchBoxGame[];
    regions: string[];
    activeConsole: ConsoleKey;
    onSelect: (game: LaunchBoxGame) => void;
    scrollRef?: RefObject<HTMLDivElement | null>;
    renderStoreCard?: (game: LaunchBoxGame) => ReactNode;
    preview?: boolean;
}) {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const gridRef = useRef<HTMLDivElement>(null);

    // Reset pagination when games list changes (console switch / search)
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [games]);

    const visibleGames = useMemo(
        () => games.slice(0, visibleCount),
        [games, visibleCount],
    );
    const shelfColumns = useSyncExternalStore(subscribeShelfWidth, getShelfColumns);
    const columns = renderStoreCard ? Math.min(shelfColumns, 4) : shelfColumns;
    const rowCount = Math.ceil(visibleGames.length / columns);

    const [scrollMargin, setScrollMargin] = useState(0);
    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;
        const measure = () => setScrollMargin(grid.offsetTop);
        measure();
        const observer = new ResizeObserver(measure);
        for (let sibling = grid.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
            observer.observe(sibling);
        }
        return () => observer.disconnect();
    }, [games]);

    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => scrollRef?.current ?? null,
        estimateSize: () => 200,
        overscan: 3,
        scrollMargin,
    });

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
