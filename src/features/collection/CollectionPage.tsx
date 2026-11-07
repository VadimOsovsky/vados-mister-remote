import { useRef, useState } from 'react';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { useCollection } from '../../hooks/useCollection';
import { useNavigate } from 'react-router';
import { PlusIcon } from '../../lib/icons';
import { PlayroomConsoleHeader } from '../../kit/PlayroomConsoleHeader';
import { SearchBar } from './SearchBar';
import { FavoriteStar } from './FavoriteBookmark';
import { GameGrid } from './GameGrid';
import { RecentlyPlayed } from './RecentlyPlayed';
import { AddGameSheet } from './AddGameSheet';
import { CollectionEmptyArt } from './CollectionEmptyArt';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import './CollectionPage.css';

export function CollectionPage({ onSelectGame }: { onSelectGame: (game: LaunchBoxGame) => void }) {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<'all' | 'favorites' | 'completed'>('all');
    const activeConsole = useCollectionState(state => state.activeConsole);
    const setActiveConsole = useCollectionState(state => state.setActiveConsole);
    const platform = usePlatform();
    const beatenIds = useCollectionState(state => state.beatenIds);
    const favoriteIds = useCollectionState(state => state.favoriteIds);
    const { recentGames, mockRecent, loading, loadError, preview, search, setSearch, filteredGames } = useCollection(activeConsole);
    const completedGames = filteredGames.filter(game => beatenIds.includes(game.id));
    const favoriteGames = filteredGames.filter(game => favoriteIds.includes(game.id));
    const [, setHistoryVersion] = useState(0);
    const displayedGames = { all: filteredGames, favorites: favoriteGames, completed: completedGames }[filter];
    const isFiltered = Boolean(search) || filter !== 'all';
    const scrollRef = useRef<HTMLDivElement>(null);
    const [addSheetOpen, setAddSheetOpen] = useState(false);

    function switchConsole(key: ConsoleKey) {
        setActiveConsole(key);
        setSearch('');
        setFilter('all');
    }

    return (
        <div className="page-layout collection-page">
            <PlayroomConsoleHeader onSwitch={switchConsole} />

            <div className="page-scroll" ref={scrollRef}>
                {!loading && recentGames.length > 0 && (
                    <RecentlyPlayed key={activeConsole} games={recentGames} consoleKey={activeConsole}
                        preview={preview} mock={mockRecent} onSelect={onSelectGame} onHistoryChange={() => setHistoryVersion(version => version + 1)} />
                )}
                <div className="shelf-tools">
                    <div className="shelf-heading">
                        <h1>All games on your shelf</h1>
                    </div>
                    <div className="shelf-search-row">
                        <SearchBar value={search} onChange={setSearch} />
                        <button className="add-game-btn playroom-press playroom-field-action" aria-label="Add a game" onClick={() => setAddSheetOpen(true)}>
                            {PlusIcon}
                        </button>
                    </div>
                    <div className="shelf-filters" role="group" aria-label="Filter collection">
                        <button className="playroom-press" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                            All games <span>{filteredGames.length}</span>
                        </button>
                        <button className="playroom-press" aria-pressed={filter === 'favorites'} onClick={() => setFilter('favorites')}>
                            <FavoriteStar /> Favorites <span>{favoriteGames.length}</span>
                        </button>
                        <button className="playroom-press" aria-pressed={filter === 'completed'} onClick={() => setFilter('completed')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                            Completed <span>{completedGames.length}</span>
                        </button>
                    </div>
                </div>

                <div className="loading-bar-wrap">
                    {loading && <div className="loading-bar" role="status" aria-label="Loading collection" />}
                </div>

                {!loading && loadError && <p className="shelf-empty" role="alert">Could not load your collection.</p>}
                {!loading && !loadError && !displayedGames.length && (
                    isFiltered ? (
                        <p className="shelf-no-results" role="status">No games found. Try another search or filter.</p>
                    ) : (
                        <section className="shelf-empty">
                            <CollectionEmptyArt />
                            <h2>Your shelf is waiting</h2>
                            <p>Find your first game for {platform.name}.</p>
                            <button className="playroom-primary playroom-press" onClick={() => navigate(preview ? '/store?preview=1' : '/store')}>Find your first game</button>
                        </section>
                    )
                )}
                <GameGrid games={displayedGames} regions={platform.imageRegions} activeConsole={activeConsole}
                    onSelect={onSelectGame} scrollRef={scrollRef} preview={preview} />
            </div>

            <AddGameSheet open={addSheetOpen} onOpenChange={setAddSheetOpen} />
        </div>
    );
}
