import { useEffect, useRef, useState } from 'react';
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
    const [highlight, setHighlight] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => { setHighlight(-1); }, [romSearchResults]);

    // Auto-focus input on mount
    useEffect(() => {
        // Small delay lets the morph animation start before keyboard appears
        const t = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlight < 0 || !listRef.current) return;
        const el = listRef.current.children[highlight] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlight]);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') { closeRomPicker(); return; }
        if (!romSearchResults.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight(i => (i + 1) % romSearchResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(i => (i <= 0 ? romSearchResults.length - 1 : i - 1));
        } else if (e.key === 'Enter' && highlight >= 0) {
            e.preventDefault();
            selectRom(romSearchResults[highlight]);
        }
    }

    const hasResults = romSearchResults.length > 0;
    const showDropdown = hasResults || romSearchLoading || romSearchError;

    return (
        <div className="rp-morph">
            {/* Results grow upward from the input */}
            {showDropdown && (
                <ul className="rp-dropdown" ref={listRef}>
                    {romSearchError && !romSearchLoading && (
                        <li className="rp-status rp-error">{romSearchError}</li>
                    )}
                    {romSearchLoading && !hasResults && (
                        <li className="rp-status">
                            <span className="rp-status-spinner" />
                            Searching...
                        </li>
                    )}
                    {romSearchResults.map((r, i) => (
                        <li
                            key={r.path}
                            className={`rp-item${i === highlight ? ' rp-item-active' : ''}`}
                            onPointerDown={() => selectRom(r)}
                        >
                            <span className="rp-item-name">{r.name}</span>
                            <span className="rp-item-path">{r.path}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Search input — same size/shape as the button it replaced */}
            <div className="rp-input-row">
                <input
                    ref={inputRef}
                    className="rp-input"
                    type="text"
                    value={romSearchQuery}
                    onChange={e => setRomSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search ROMs on MiSTer..."
                    autoComplete="off"
                />
                {romSearchLoading && <span className="rp-spinner" />}
                <button className="rp-close" onClick={closeRomPicker} aria-label="Close">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
            </div>
        </div>
    );
}
