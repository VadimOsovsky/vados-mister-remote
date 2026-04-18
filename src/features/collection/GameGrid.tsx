import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { LaunchBoxGame } from '../../types';
import { LazyImage } from '../../kit/LazyImage';
import { getImageUrl, resolveImages } from '../../services/launchbox';
import './GameGrid.css';

const PAGE_SIZE = 50;
const COLS = 2;

function GameCard({ game, regions, onSelect }: {
    game: LaunchBoxGame;
    regions: string[];
    onSelect: (game: LaunchBoxGame) => void;
}) {
    const images = resolveImages(game, regions);
    const frontSrc = images.front ? getImageUrl(images.front, 200) : undefined;
    return (
        <div className="game-card" onClick={() => onSelect(game)}>
            <div className="card-art-wrap">
                <LazyImage src={frontSrc} alt={game.title} className="card-art" />
            </div>
            <div className="card-badge">
                <div className="card-title">{game.title}</div>
                <div className="card-year">{game.year}</div>
            </div>
        </div>
    );
}

export function GameGrid({ games, regions, onSelect }: {
    games: LaunchBoxGame[];
    regions: string[];
    onSelect: (game: LaunchBoxGame) => void;
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
    const rowCount = Math.ceil(visibleGames.length / COLS);

    const scrollMargin = gridRef.current?.offsetTop ?? 0;

    const virtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => document.querySelector('.app-content') as HTMLElement | null,
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
            className="game-grid"
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualItems.map(virtualRow => {
                const startIndex = virtualRow.index * COLS;
                return (
                    <div
                        key={virtualRow.key}
                        ref={virtualizer.measureElement}
                        data-index={virtualRow.index}
                        className="game-grid-row"
                        style={{
                            transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                        }}
                    >
                        {Array.from({ length: COLS }, (_, col) => {
                            const game = visibleGames[startIndex + col];
                            if (!game) return <div key={col} />;
                            return (
                                <GameCard
                                    key={game.id}
                                    game={game}
                                    regions={regions}
                                    onSelect={onSelect}
                                />
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
