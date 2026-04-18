import { useCallback } from 'react';
import { useAppContext } from '../../AppContext';
import { useStore } from '../../hooks/useStore';
import { STORE_KEYS } from '../../constants';
import { ConsoleSwitcher } from '../collection/ConsoleSwitcher';
import { SearchBar } from '../collection/SearchBar';
import { GameGrid } from '../collection/GameGrid';
import { BrandingBar } from '../collection/BrandingBar';
import type { ConsoleKey } from '../../types';
import './StorePage.css';

export function StorePage() {
    const { activeConsole, setActiveConsole, platform, connected } = useAppContext();
    const { loading, search, setSearch, sort, setSort, filteredGames } = useStore(activeConsole);

    const switchConsole = useCallback((key: ConsoleKey) => {
        setActiveConsole(key);
        setSearch('');
    }, [setActiveConsole, setSearch]);

    return (
        <>
            <div className="header">
                <div className="header-top">
                    <div className="header-title">Store</div>
                    <div className="status-badge">
                        <div className={`status-dot ${connected ? '' : 'offline'}`} />
                        <span>{connected ? 'Connected' : 'Offline'}</span>
                    </div>
                </div>
                <ConsoleSwitcher activeConsole={activeConsole} onSwitch={switchConsole} keys={STORE_KEYS} />
            </div>

            <SearchBar value={search} onChange={setSearch} sort={sort} sortCycle={['popular', 'year', 'title']} onSortChange={setSort} />

            <div className="loading-bar-wrap">
                {loading && <div className="loading-bar" />}
            </div>
            <div className="section-label">Store · {filteredGames.length} games</div>

            <GameGrid games={filteredGames} regions={platform.imageRegions} onSelect={() => {}} />

            <BrandingBar text={platform.branding} />
        </>
    );
}
