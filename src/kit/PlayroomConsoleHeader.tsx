import { useState, type ReactNode } from 'react';
import { useAppContext } from '../AppContext';
import { ConsoleBadge, ConsoleSheet } from './ConsoleCarousel/ConsoleSheet';
import { PlayroomHeader } from './PlayroomHeader';
import type { ConsoleKey } from '../types';

export function PlayroomConsoleHeader({ onSwitch, alternate, showAlternate = false }: {
    onSwitch?: (key: ConsoleKey) => void;
    alternate?: ReactNode;
    showAlternate?: boolean;
}) {
    const { connected, setActiveConsole } = useAppContext();
    const [open, setOpen] = useState(false);

    const connectionLabel = connected ? 'Connected to MiSTer' : 'Disconnected from MiSTer';
    const logo = (
        <div className="playroom-brand">
            <img className="playroom-logo" src="/playroom/logo.png" alt="Mister Playroom" />
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
