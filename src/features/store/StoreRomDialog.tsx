import './StoreRomDialog.css';
import { useRef, useState } from 'react';
import { Drawer } from 'vaul';
import type { useRomPicker } from '../../hooks/useRomPicker';
import type { WizzoGameSearchResult } from '../../services/wizzoApi';
import { FileIcon, SearchIcon, StoreIcon } from '../../lib/icons';
import { formatPrice } from '../../lib/pricing';

type Picker = ReturnType<typeof useRomPicker>;

export function StoreRomDialog({ picker, title, consoleName, price, preview, canPurchase }: {
    picker: Picker;
    title: string;
    consoleName: string;
    price: number;
    preview: boolean;
    canPurchase: boolean;
}) {
    return (
        <Drawer.Root autoFocus={false} open={picker.romPickerOpen} onOpenChange={open => { if (!open) picker.closeRomPicker(); }}>
            <Drawer.Portal>
                <Drawer.Overlay className="owned-dialog-overlay" />
                <Drawer.Content className="store-rom-dialog" aria-describedby={undefined}>
                    <header>
                        <div><p className="store-kicker">One last thing</p><Drawer.Title>Choose a game file</Drawer.Title></div>
                        <Drawer.Close className="playroom-button playroom-icon-button playroom-press" aria-label="Close">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                        </Drawer.Close>
                    </header>
                    {picker.romPickerOpen && <StoreRomForm {...{ picker, title, consoleName, price, preview, canPurchase }} />}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

function StoreRomForm({ picker, title, consoleName, price, preview, canPurchase }: {
    picker: Picker;
    title: string;
    consoleName: string;
    price: number;
    preview: boolean;
    canPurchase: boolean;
}) {
    const searchRef = useRef<HTMLInputElement>(null);
    const [selected, setSelected] = useState<string>();
    const extension = consoleName === 'FDS' ? 'fds' : 'nes';
    const regions = ['USA', 'Europe', 'Japan'];
    const results = preview ? Array.from({ length: 12 }, (_, index) => {
        const region = regions[index % regions.length];
        const revision = index === 1 ? 1 : Math.floor(index / regions.length) + Number(region === 'Europe');
        const name = title + ' (' + region + ')' + (revision ? ' (Rev ' + revision + ')' : '') + '.' + extension;
        const directory = '/media/fat/games/' + consoleName + '/' + (region === 'Japan' ? 'Japan/' : '');
        return { name, path: directory + name, system: { id: consoleName, name: consoleName } };
    }).filter(file => file.name.toLowerCase().includes(picker.romSearchQuery.toLowerCase())) : picker.romSearchResults;
    const file = results.find(result => result.path === selected);
    const loading = !preview && picker.romSearchLoading;
    const error = !preview && picker.romSearchError;

    function updateQuery(query: string) {
        setSelected(undefined);
        picker.setRomSearchQuery(query);
    }

    function confirm(result: WizzoGameSearchResult) {
        if (preview) picker.closeRomPicker();
        else void picker.selectRom(result);
    }

    return (
        <>
            <div className="store-rom-content" data-vaul-no-drag>
                <div className="store-rom-game">
                    <span className="store-rom-mark">{StoreIcon}</span>
                    <span><strong>{title}</strong><small>{consoleName} · Files on your MiSTer</small></span>
                </div>
                <p>Pick the ROM you want to link to this game.</p>
                <div className="store-rom-search">
                    {SearchIcon}
                    <input ref={searchRef} type="search" aria-label="Search files on MiSTer" placeholder="Search files on MiSTer…"
                        value={picker.romSearchQuery} onChange={event => updateQuery(event.target.value)} />
                    {picker.romSearchQuery && (
                        <button type="button" className="store-rom-clear" aria-label="Clear search" onClick={() => {
                            updateQuery('');
                            searchRef.current?.focus();
                        }}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                        </button>
                    )}
                </div>
                <div className="store-rom-count" aria-live="polite">
                    <span>{loading ? error || 'Searching…' : `${results.length} ${results.length === 1 ? 'file' : 'files'} found`}</span>
                    <span>Name &amp; location</span>
                </div>
                <div className="store-rom-results" role="group" aria-label="Available game files">
                    {!loading && !results.length && <p role="status">{error || 'No matching files.'}</p>}
                    {results.map(result => (
                        <label className="store-rom-file" key={result.path}>
                            <span className="store-rom-file-icon" aria-hidden="true">{FileIcon}<small>{result.name.split('.').at(-1)}</small></span>
                            <span><strong>{result.name}</strong><small>{result.path.slice(0, result.path.lastIndexOf('/') + 1)}</small></span>
                            <input type="radio" name="store-rom" checked={file?.path === result.path}
                                onChange={() => setSelected(result.path)} />
                        </label>
                    ))}
                </div>
            </div>
            <footer>
                <p aria-live="polite">{file ? file.name : 'Choose a file to continue'}</p>
                <div className="store-rom-actions">
                    <Drawer.Close className="playroom-button playroom-press">Cancel</Drawer.Close>
                    <button className="playroom-button playroom-primary playroom-press"
                        disabled={!file || loading || !canPurchase} onClick={() => { if (file) confirm(file); }}>
                        <span>Buy game</span><strong>{formatPrice(price)}</strong>
                    </button>
                </div>
            </footer>
        </>
    );
}
