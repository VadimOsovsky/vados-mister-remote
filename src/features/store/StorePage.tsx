import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { useStore } from '../../hooks/useStore';
import { PlayroomConsoleHeader } from '../../kit/PlayroomConsoleHeader';
import { SearchBar } from '../collection/SearchBar';
import { GameGrid } from '../collection/GameGrid';
import { StoreCard } from './StoreCard';
import { StoreWallet } from './StoreWallet';
import type { ConsoleKey, LaunchBoxGame, SortMode } from '../../types';
import { StoreHeart } from './StoreHeart';
import './StorePage.css';

const sorts: { mode: SortMode; label: string }[] = [
    { mode: 'popular', label: 'Popular' },
    { mode: 'year', label: 'Release year' },
    { mode: 'title', label: 'A–Z' },
];

const storeVisits = new Map<string, {
    consoleKey: ConsoleKey;
    search: string;
    favoritesOnly: boolean;
    gameId: string;
    gameIndex: number;
    rowOffset: number;
}>();

export function StorePage() {
    const { key } = useLocation();
    return <StoreCatalog key={key} visitKey={key} />;
}

function StoreCatalog({ visitKey }: { visitKey: string }) {
    const activeConsole = useCollectionState(state => state.activeConsole);
    const setActiveConsole = useCollectionState(state => state.setActiveConsole);
    const platform = usePlatform();
    const balance = useCollectionState(state => state.balance);
    const economyDisabled = useCollectionState(state => state.economyDisabled);
    const [params] = useSearchParams();
    const preview = import.meta.env.DEV && params.get('preview') === '1';
    const savedVisit = storeVisits.get(visitKey);
    const [returnVisit, setReturnVisit] = useState(() => savedVisit?.consoleKey === activeConsole ? savedVisit : undefined);
    const favoriteIds = useCollectionState(state => state.favoriteIds);
    const [favoritesOnly, setFavoritesOnly] = useState(returnVisit?.favoritesOnly ?? false);
    const { loading, error, search, setSearch, sort, setSort, filteredGames: catalogGames } = useStore(activeConsole, preview, returnVisit?.search);
    const filteredGames = favoritesOnly ? catalogGames.filter(game => favoriteIds.includes(game.id)) : catalogGames;
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const introRef = useRef<HTMLElement>(null);
    const [showHeaderBalance, setShowHeaderBalance] = useState(false);
    const wallet = preview ? 120 : balance;

    useEffect(() => {
        const intro = introRef.current;
        if (!intro) return;
        const observer = new IntersectionObserver(([entry]) => {
            setShowHeaderBalance(entry.intersectionRatio < .5);
        }, { root: scrollRef.current, threshold: 0.5 });
        observer.observe(intro);
        return () => observer.disconnect();
    }, []);

    function openProduct(game: LaunchBoxGame, card?: HTMLButtonElement) {
        const scroller = scrollRef.current;
        const row = card?.closest('.game-grid-row');
        if (scroller && row) {
            storeVisits.set(visitKey, {
                consoleKey: activeConsole,
                search,
                favoritesOnly,
                gameId: game.id,
                gameIndex: filteredGames.indexOf(game),
                rowOffset: row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop,
            });
        }
        navigate('/store/game/' + encodeURIComponent(game.id) + (preview ? '?preview=1' : ''), {
            state: { fromStore: true },
        });
    }

    const savedGameIndex = returnVisit ? filteredGames.findIndex(game => game.id === returnVisit.gameId) : -1;
    const restore = returnVisit && filteredGames.length ? {
        gameIndex: savedGameIndex >= 0 ? savedGameIndex : Math.min(returnVisit.gameIndex, filteredGames.length - 1),
        rowOffset: returnVisit.rowOffset,
    } : undefined;

    return (
        <div className="page-layout store-page">
            <PlayroomConsoleHeader alternate={<StoreWallet balance={wallet} compact />} showAlternate={showHeaderBalance && !economyDisabled} onSwitch={key => {
                setActiveConsole(key);
                setReturnVisit(undefined);
                setSearch('');
                scrollRef.current?.scrollTo(0, 0);
            }} />
            <div className="page-scroll" ref={scrollRef}>
                <section ref={introRef} className="playroom-stage">
                    <div className="store-intro">
                        <div>
                            <p className="store-kicker">{platform.name}</p>
                            <h1>Game store<span>.</span></h1>
                            <p>A new adventure for your shelf.</p>
                        </div>
                        <StoreWallet balance={wallet} />
                    </div>
                </section>
                <main className="store-catalog">
                    <div className="shelf-tools">
                        <div className="shelf-heading">
                            <h2>Browse the shelves</h2>
                            <span className="store-total">{filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}</span>
                        </div>
                        <SearchBar value={search} onChange={setSearch} placeholder="Find a new favorite" />
                        <div className="shelf-filters store-sorts" role="group" aria-label="Sort and filter games">
                            {sorts.map(({ mode, label }) => (
                                <button key={mode} type="button" className="playroom-press" aria-pressed={sort === mode} onClick={() => setSort(mode)}>
                                    {mode === 'popular' && <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" /></svg>}{label}
                                </button>
                            ))}
                            <button type="button" className="playroom-press" aria-pressed={favoritesOnly} onClick={() => {
                                setFavoritesOnly(value => !value);
                                setReturnVisit(undefined);
                            }}>
                                <StoreHeart filled={favoritesOnly} /> Favorites
                            </button>
                        </div>
                    </div>
                    {loading && <div className="loading-bar" role="status" aria-label="Loading store" />}
                    {error && <p className="shelf-no-results" role="alert">Could not load the store catalog.</p>}
                    {!loading && !error && !filteredGames.length && (
                        <section className="store-empty">
                            <h2>{favoritesOnly ? 'No favorites found' : search ? 'No adventures found' : 'More adventures coming soon'}</h2>
                            <p role="status">{favoritesOnly ? 'Try clearing your search or add games to favorites from their store pages.' : search ? 'Try a different title or choose another console.' : 'The catalogue for this console is not available yet.'}</p>
                            {search && <button className="playroom-button playroom-press" onClick={() => setSearch('')}>Clear search</button>}
                        </section>
                    )}
                    {!loading && <GameGrid games={filteredGames} regions={platform.imageRegions} activeConsole={activeConsole}
                        scrollRef={scrollRef}
                        restore={restore}
                        onSelect={openProduct}
                        renderStoreCard={game => <StoreCard key={game.id} game={game} consoleKey={activeConsole}
                            preview={preview} onSelect={openProduct} />} />}
                </main>
            </div>
        </div>
    );
}
