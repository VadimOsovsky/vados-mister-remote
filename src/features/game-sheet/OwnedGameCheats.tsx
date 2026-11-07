import { useEffect, useState, useSyncExternalStore } from 'react';
import { subscribeToValues } from '../../lib/sharedStorage';
import { getRomMapping } from '../../lib/storage';
import { fetchCheats, NES_CHEAT_LIMIT, readCheatSelection, saveCheatSelection } from '../../services/gameCheats';
import type { CheatCatalog } from '../../services/gameCheats';
import type { ConsoleKey } from '../../types';
import './OwnedGameCheats.css';

export function OwnedGameCheats({ gameId, consoleKey, onLink }: {
    gameId: string;
    consoleKey: ConsoleKey;
    onLink: () => void;
}) {
    const rom = useSyncExternalStore(subscribeToValues, () => getRomMapping(gameId, consoleKey));
    const supportedRom = rom && /\.nes$/i.test(rom);
    if (supportedRom) return <CheatList key={rom} rom={rom} consoleKey={consoleKey} />;
    return <>
        <CheatsBanner />
        {!rom && <div className="owned-cheats-message">
            <strong>Choose a game file</strong>
            <p>Playroom uses your linked ROM to find the matching cheat archive.</p>
            <button className="owned-button playroom-press" onClick={onLink}>Link ROM</button>
        </div>}
        {rom && !supportedRom && <p className="owned-cheats-message">Cheats are available for NES cartridge ROMs (.nes).</p>}
    </>;
}

function CheatsBanner({ requiresZaparoo = false }: { requiresZaparoo?: boolean }) {
    return (
        <div className="owned-cheats-banner">
            <div>
                <p className="owned-eyebrow">Game Genie</p>
                <h2>Cheats</h2>
                <p>{requiresZaparoo ? 'Start MiSTer with Zaparoo Main to apply your selection automatically.' : 'Pick effects for your next launch.'}</p>
            </div>
            <svg viewBox="0 0 64 64" aria-hidden="true">
                <path d="M16 13h32v38H16zM22 13V7m10 6V7m10 6V7M22 51v6m10-6v6m10-6v6M16 22h-6m6 10h-6m6 10h-6m38-20h6m-6 10h6m-6 10h6" />
                <path d="m34 19-10 15h8l-2 11 10-15h-8z" className="owned-cheats-bolt" />
            </svg>
        </div>
    );
}

function CheatList({ rom, consoleKey }: { rom: string; consoleKey: ConsoleKey }) {
    const [result, setResult] = useState<CheatCatalog | string>();
    const [request, setRequest] = useState(0);
    const [selection, setSelection] = useState(() => readCheatSelection(consoleKey, rom));
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        void fetchCheats(rom, controller.signal).then(catalog => {
            if (!controller.signal.aborted) setResult(catalog);
        }).catch(error => {
            if (!controller.signal.aborted) setResult(error instanceof Error ? error.message : 'Could not load cheats.');
        });
        return () => controller.abort();
    }, [rom, request]);

    function select(names: string[]) {
        saveCheatSelection(consoleKey, rom, names);
        setSelection(names);
    }

    if (result === undefined) return <><CheatsBanner /><p className="owned-cheats-message" role="status">Reading the MiSTer cheat library…</p></>;
    if (typeof result === 'string') return <><CheatsBanner /><div className="owned-cheats-message">
        <p role="alert">{result}</p>
        <button className="owned-button playroom-press" onClick={() => { setResult(undefined); setRequest(request + 1); }}>Retry</button>
        {selection.length > 0 && <button className="owned-button playroom-press" onClick={() => select([])}>Clear selection</button>}
    </div></>;

    const codeCount = result.entries.reduce((total, entry) => total + (selection.includes(entry.id) ? entry.codes : 0), 0);
    const selectedCount = result.entries.filter(entry => selection.includes(entry.id)).length;
    const visible = result.entries.filter(entry => entry.id.toLowerCase().includes(filter.trim().toLowerCase()));
    return <>
        <CheatsBanner requiresZaparoo={!result.supported && result.entries.length > 0} />
        <div className="owned-cheats-toolbar">
            <div><strong>Installed effects</strong><small>{rom.split('/').pop()}</small></div>
            {selection.length > 0 && <button className="owned-button playroom-press" onClick={() => select([])}>Clear {selection.length}</button>}
        </div>
        {selection.length > selectedCount &&
            <p className="owned-cheats-notice" role="status">The archive changed. Clear your selection before playing.</p>}
        {!result.entries.length && <p className="owned-cheats-message">No installed cheats matched this ROM.</p>}
        {result.entries.length > 8 && <input className="owned-cheats-filter" type="search" aria-label="Filter effects"
            placeholder="Find an effect…" value={filter} onChange={event => setFilter(event.target.value)} />}
        {result.entries.length > 0 && !visible.length && <p className="owned-cheats-message">No effects match your search.</p>}
        {visible.length > 0 && <ul className="owned-cheats-list">
            {visible.map(({ id, codes }) => {
                const checked = selection.includes(id);
                const label = (id.split('/').pop() ?? id).replace(/(?: \[genie\])?\.gg$/i, '');
                return <li key={id}>
                    <button type="button" className="owned-cheat-row" role="switch" aria-checked={checked}
                        aria-label={label} disabled={!checked && codeCount + codes > NES_CHEAT_LIMIT}
                        onClick={() => select(checked ? selection.filter(name => name !== id) : [...selection, id])}>
                        <span className="owned-cheat-name">{label}</span>
                        <span className="owned-cheat-switch" aria-hidden="true" />
                    </button>
                </li>;
            })}
        </ul>}
        {codeCount > 0 && <p className="owned-cheats-footnote">{codeCount} / {NES_CHEAT_LIMIT} NES codes selected</p>}
    </>;
}
