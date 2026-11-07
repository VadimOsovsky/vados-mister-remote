import { useState, type ReactNode } from 'react';
import { useCollectionState } from '../state/collectionState';
import { useMisterState } from '../state/misterState';
import { ConsoleBadge, ConsoleSheet } from './ConsoleCarousel/ConsoleSheet';
import { PlayroomHeader } from './PlayroomHeader';
import type { ConsoleKey } from '../types';
import logoUrl from '../assets/playroom-logo.webp';

export function PlayroomConsoleHeader({ onSwitch, alternate, showAlternate = false }: {
    onSwitch?: (key: ConsoleKey) => void;
    alternate?: ReactNode;
    showAlternate?: boolean;
}) {
    const connected = useMisterState(state => state.connected);
    const setActiveConsole = useCollectionState(state => state.setActiveConsole);
    const [open, setOpen] = useState(false);

    const connectionLabel = connected ? 'Connected to MiSTer' : 'Disconnected from MiSTer';
    const logo = (
        <div className="playroom-brand">
            <img className="playroom-logo" src={logoUrl} alt="Mister Playroom" decoding="sync" fetchPriority="high" />
            <span className="playroom-connection-light" data-connected={connected}
                role="img" aria-label={connectionLabel} title={connectionLabel} />
        </div>
    );

    return (
        <>
            <PlayroomHeader>
                {alternate ? (
                    <div className="playroom-header-swap" data-alternate={showAlternate}>
                        <div aria-hidden={showAlternate}>{logo}</div>
                        <div aria-hidden={!showAlternate}>{alternate}</div>
                    </div>
                ) : logo}
                <ConsoleBadge expanded={open} onClick={() => setOpen(true)} />
            </PlayroomHeader>
            <ConsoleSheet open={open} onOpenChange={setOpen} onSwitch={onSwitch ?? setActiveConsole} />
        </>
    );
}
