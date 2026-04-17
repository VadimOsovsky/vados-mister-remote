import { useCallback } from 'react';
import { useAppContext } from '../../AppContext';
import { useCollection } from '../../hooks/useCollection';
import { ConsoleSwitcher } from './ConsoleSwitcher';
import { SearchBar } from './SearchBar';
import { GameGrid } from './GameGrid';
import { BrandingBar } from './BrandingBar';
import type { ConsoleKey, SSGame } from '../../types';
import './CollectionPage.css';

export function CollectionPage({ onSelectGame }: { onSelectGame: (game: SSGame) => void }) {
    const { activeConsole, setActiveConsole, platform, connected } = useAppContext();
    const { loading, search, setSearch, filteredGames } = useCollection(activeConsole);

    const switchConsole = useCallback((key: ConsoleKey) => {
        setActiveConsole(key);
        setSearch('');
    }, [setActiveConsole, setSearch]);

    return (
        <>
            <div className="header">
                <div className="header-top">
                    <div className="header-title">MiSTer Remote</div>
                    <div className="status-badge">
                        <div className={`status-dot ${connected ? '' : 'offline'}`} />
                        <span>{connected ? 'Connected' : 'Offline'}</span>
                    </div>
                </div>
                <ConsoleSwitcher activeConsole={activeConsole} onSwitch={switchConsole} />
            </div>

            <SearchBar value={search} onChange={setSearch} />

            <div className="loading-bar-wrap">
                {loading && <div className="loading-bar" />}
            </div>
            <div className="section-label">Collection · {filteredGames.length} games</div>

            <GameGrid games={filteredGames} regions={platform.mediaRegions} onSelect={onSelectGame} />

            <BrandingBar text={platform.branding} />
        </>
    );
}
