import type { SSGame } from '../../types';
import type { WizzoGameSearchResult } from '../../services/wizzoApi';
import { PlayIcon } from '../../lib/icons';
import { resolveFrontThumb } from '../../services/screenscraper';
import { RomPicker } from './RomPicker';
import './MainTab.css';

export function MainTab({ game, regions, connected, romPicker, onLaunch }: {
    game: SSGame;
    regions: string[];
    connected: boolean;
    romPicker: {
        romPickerOpen: boolean;
        romSearchQuery: string;
        setRomSearchQuery: (q: string) => void;
        romSearchResults: WizzoGameSearchResult[];
        romSearchLoading: boolean;
        romSearchError: string | null;
        closeRomPicker: () => void;
        searchRoms: (q: string) => void;
        selectRom: (r: WizzoGameSearchResult) => void;
    };
    onLaunch: () => void;
}) {
    const front = resolveFrontThumb(game, regions);
    const frontRotStyle = front?.rotation ? { transform: `rotate(${front.rotation}deg)` } : undefined;

    return (
        <div className="sheet-panel">
            <div className="sheet-main-layout">
                <div className="sheet-art">
                    {front && <img src={front.src} alt={game.name} style={frontRotStyle} />}
                </div>
                <div className="sheet-main-details">
                    <div className="sheet-main-row">
                        <span className="sheet-main-label">Developer</span>
                        <span className="sheet-main-value">{game.developer}</span>
                    </div>
                    <div className="sheet-main-row">
                        <span className="sheet-main-label">Publisher</span>
                        <span className="sheet-main-value">{game.publisher}</span>
                    </div>
                    <div className="sheet-main-row">
                        <span className="sheet-main-label">Players</span>
                        <span className="sheet-main-value">{game.players}</span>
                    </div>
                    <div className="sheet-main-row">
                        <span className="sheet-main-label">Genre</span>
                        <span className="sheet-main-value">{game.genre}</span>
                    </div>
                    {game.rating && (
                        <div className="sheet-main-row">
                            <span className="sheet-main-label">Rating</span>
                            <span className="sheet-main-value">{game.rating}/20</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="sheet-desc">{game.synopsis}</div>
            <button
                className="sheet-btn sheet-btn-primary ctrl-launch-btn"
                onClick={onLaunch}
                disabled={!connected}
            >
                {PlayIcon}
                <span>Launch Game</span>
            </button>

            {romPicker.romPickerOpen && <RomPicker {...romPicker} />}
        </div>
    );
}
