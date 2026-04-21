import type { WizzoGameSearchResult } from '../../services/wizzoApi';
import './RomPicker.css';

export function RomPicker({
    romSearchQuery, setRomSearchQuery,
    romSearchResults, romSearchLoading, romSearchError,
    closeRomPicker, selectRom,
}: {
    romSearchQuery: string;
    setRomSearchQuery: (q: string) => void;
    romSearchResults: WizzoGameSearchResult[];
    romSearchLoading: boolean;
    romSearchError: string | null;
    closeRomPicker: () => void;
    selectRom: (r: WizzoGameSearchResult) => void;
}) {
    return (
        <div className="rom-picker-overlay">
            <div className="rom-picker">
                <div className="rom-picker-header">
                    <span className="rom-picker-title">Select ROM</span>
                    <button className="rom-picker-close" onClick={closeRomPicker}>&times;</button>
                </div>
                <div className="rom-picker-search">
                    <input
                        className="rom-picker-input"
                        type="text"
                        value={romSearchQuery}
                        onChange={e => setRomSearchQuery(e.target.value)}
                        placeholder="Search ROMs on MiSTer..."
                        autoFocus
                    />
                </div>
                <div className="rom-picker-results">
                    {romSearchLoading && (
                        <div className="rom-picker-status">Searching...</div>
                    )}
                    {romSearchError && !romSearchLoading && (
                        <div className="rom-picker-status rom-picker-error">{romSearchError}</div>
                    )}
                    {!romSearchLoading && romSearchResults.map(result => (
                        <button
                            key={result.path}
                            className="rom-picker-result"
                            onClick={() => selectRom(result)}
                        >
                            <span className="rom-picker-result-name">{result.name}</span>
                            <span className="rom-picker-result-path">{result.path}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
