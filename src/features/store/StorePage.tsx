import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAppContext } from '../../AppContext';
import { useStore } from '../../hooks/useStore';
import { PlayroomConsoleHeader } from '../../kit/PlayroomConsoleHeader';
import { SearchBar } from '../collection/SearchBar';
import { GameGrid } from '../collection/GameGrid';
import { StoreCard } from './StoreCard';
import { StoreWallet } from './StoreWallet';
import type { LaunchBoxGame, SortMode } from '../../types';
import './StorePage.css';

const sorts: { mode: SortMode; label: string }[] = [
    { mode: 'popular', label: 'Popular' },
    { mode: 'year', label: 'Release year' },
    { mode: 'title', label: 'A–Z' },
];

export function StorePage() {
    const { activeConsole, setActiveConsole, platform, balance } = useAppContext();
    const [params] = useSearchParams();
    const preview = import.meta.env.DEV && params.get('preview') === '1';
    const { loading, error, search, setSearch, sort, setSort, filteredGames } = useStore(activeConsole, preview);
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

    function openProduct(game: LaunchBoxGame) {
        navigate('/store/game/' + encodeURIComponent(game.id) + (preview ? '?preview=1' : ''));
    }

    return (
        <div className="page-layout store-page">
            <PlayroomConsoleHeader alternate={<StoreWallet balance={wallet} compact />} showAlternate={showHeaderBalance} onSwitch={key => {
                setActiveConsole(key);
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
                        <div className="shelf-filters store-sorts" role="group" aria-label="Sort games">
                            {sorts.map(({ mode, label }) => (
                                <button key={mode} type="button" className="playroom-press" aria-pressed={sort === mode} onClick={() => setSort(mode)}>
                                    {mode === 'popular' && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" /></svg>}{label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {loading && <div className="loading-bar" role="status" aria-label="Loading store" />}
                    {error && <p className="shelf-no-results" role="alert">Could not load the store catalog.</p>}
                    {!loading && !error && !filteredGames.length && (
                        <section className="store-empty">
                            <h2>{search ? 'No adventures found' : 'More adventures coming soon'}</h2>
                            <p role="status">{search ? 'Try a different title or choose another console.' : 'The catalogue for this console is not available yet.'}</p>
                            {search && <button className="playroom-button playroom-press" onClick={() => setSearch('')}>Clear search</button>}
                        </section>
                    )}
                    <GameGrid games={filteredGames} regions={platform.imageRegions} activeConsole={activeConsole}
                        scrollRef={scrollRef}
                        onSelect={openProduct}
                        renderStoreCard={game => <StoreCard key={game.id} game={game} consoleKey={activeConsole}
                            preview={preview} onSelect={openProduct} />} />
                </main>
            </div>
        </div>
    );
}
