import { useCallback, useRef } from 'react';
import { useAppContext } from '../../AppContext';
import { useCollection } from '../../hooks/useCollection';
import { ConsoleSwitcher } from './ConsoleSwitcher';
import { SearchBar } from './SearchBar';
import { GameGrid } from './GameGrid';
import { BrandingBar } from './BrandingBar';
import { COLLECTION_KEYS } from '../../constants';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import './CollectionPage.css';

export function CollectionPage({ onSelectGame }: { onSelectGame: (game: LaunchBoxGame) => void }) {
    const { activeConsole, setActiveConsole, platform, connected } = useAppContext();
    const { loading, search, setSearch, filteredGames } = useCollection(activeConsole);
    const scrollRef = useRef<HTMLDivElement>(null);

    const switchConsole = useCallback((key: ConsoleKey) => {
        setActiveConsole(key);
        setSearch('');
    }, [setActiveConsole, setSearch]);

    return (
        <div className="page-layout">
            <div className="header">
                <div className="header-top">
                    <div className="header-title">MiSTer Remote</div>
                    <div className="status-badge">
                        <div className={`status-dot ${connected ? '' : 'offline'}`} />
                        <span>{connected ? 'Connected' : 'Offline'}</span>
                    </div>
                </div>
                <ConsoleSwitcher activeConsole={activeConsole} onSwitch={switchConsole} keys={COLLECTION_KEYS} />
            </div>

            <div className="page-scroll" ref={scrollRef}>
                <SearchBar value={search} onChange={setSearch} />

                <div className="loading-bar-wrap">
                    {loading && <div className="loading-bar" />}
                </div>
                <div className="section-label">Collection · {filteredGames.length} games</div>

                <GameGrid games={filteredGames} regions={platform.imageRegions} activeConsole={activeConsole} onSelect={onSelectGame} scrollRef={scrollRef} />

                <BrandingBar text={platform.branding} />
            </div>
        </div>
    );
}
