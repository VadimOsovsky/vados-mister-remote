import type { ConsoleKey, LaunchBoxGame } from '../../types';
import type { WizzoGameSearchResult } from '../../services/wizzoApi';
import { PlayIcon } from '../../lib/icons';
import { getImageUrl, resolveImages } from '../../services/launchbox';
import { getGameOverrides } from '../../lib/storage';
import { RomPicker } from './RomPicker';
import './MainTab.css';

export function MainTab({ game, regions, activeConsole, connected, romPicker, onLaunch }: {
    game: LaunchBoxGame;
    regions: string[];
    activeConsole: ConsoleKey;
    connected: boolean;
    romPicker: {
        romPickerOpen: boolean;
        romSearchQuery: string;
        setRomSearchQuery: (q: string) => void;
        romSearchResults: WizzoGameSearchResult[];
        romSearchLoading: boolean;
        romSearchError: string | null;
        closeRomPicker: () => void;
        selectRom: (r: WizzoGameSearchResult) => void;
    };
    onLaunch: () => void;
}) {
    const overrides = getGameOverrides(game.id, activeConsole);
    const images = resolveImages(game, regions);
    const frontSrc = overrides.boxFrontUrl || (images.front ? getImageUrl(images.front, 400) : undefined);

    return (
        <div className="sheet-panel">
            <div className="sheet-main-layout">
                <div className="sheet-art">
                    {frontSrc && <img src={frontSrc} alt={game.title} />}
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
                        <span className="sheet-main-value">{game.maxPlayers}</span>
                    </div>
                    <div className="sheet-main-row">
                        <span className="sheet-main-label">Genre</span>
                        <span className="sheet-main-value">{game.genre}</span>
                    </div>
                </div>
            </div>
            <div className="sheet-desc">{game.desc}</div>
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
