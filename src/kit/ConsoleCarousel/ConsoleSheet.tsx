import { useState } from 'react';
import { Drawer } from 'vaul';
import { BottomSheet } from '../BottomSheet';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { PLATFORMS } from '../../constants';
import { ChevronDownIcon, SearchIcon } from '../../lib/icons';
import { ConsoleControls } from './ConsoleControls';
import type { ConsoleKey } from '../../types';
import nesPhoto from '../../assets/consoles/nes.webp';
import famicomPhoto from '../../assets/consoles/famicom.webp';
import fdsPhoto from '../../assets/consoles/fds.webp';
import dendyPhoto from '../../assets/consoles/dendy.webp';
import avFamicomPhoto from '../../assets/consoles/av-famicom.webp';
import avFamicomFdsPhoto from '../../assets/consoles/av-famicom-fds.webp';
import './ConsoleSheet.css';

const consolePhotos: Partial<Record<ConsoleKey, string>> = {
    nes_ntsc: nesPhoto,
    nes_pal: nesPhoto,
    famicom: famicomPhoto,
    fds: fdsPhoto,
    dendy: dendyPhoto,
    av_famicom: avFamicomPhoto,
    av_famicom_fds: avFamicomFdsPhoto,
};

export function ConsoleBadge({ onClick, expanded }: { onClick: () => void; expanded: boolean }) {
    const platform = usePlatform();
    const activeConsole = useCollectionState(state => state.activeConsole);
    const photo = consolePhotos[activeConsole];

    return (
        <button className="console-badge playroom-press" onClick={onClick} aria-haspopup="dialog" aria-expanded={expanded} aria-label={platform.name} title={platform.name}>
            {photo && <img className="console-badge-photo" src={photo} alt="" />}
            <span className="console-badge-name">{activeConsole === 'av_famicom_fds' ? 'AV FC FDS' : platform.name}</span>
            <span className="console-badge-chevron" aria-hidden="true">{ChevronDownIcon}</span>
        </button>
    );
}

export function ConsoleSheet({ open, onOpenChange, onSwitch }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitch: (key: ConsoleKey) => void;
}) {
    const activeConsole = useCollectionState(state => state.activeConsole);
    const platform = PLATFORMS[activeConsole];
    const [search, setSearch] = useState('');
    const options = (Object.keys(PLATFORMS) as ConsoleKey[]).filter(key =>
        (PLATFORMS[key].name + ' ' + PLATFORMS[key].branding).toLowerCase().includes(search.trim().toLowerCase()),
    );
    const hasControls = !!platform.controls?.length;

    function changeOpen(nextOpen: boolean) {
        if (!nextOpen) setSearch('');
        onOpenChange(nextOpen);
    }

    function selectConsole(key: ConsoleKey) {
        if (key !== activeConsole) onSwitch(key);
        changeOpen(false);
    }

    return (
        <BottomSheet open={open} onOpenChange={changeOpen} overlayClassName="console-sheet-overlay" className="console-sheet">
            <Drawer.Handle className="console-sheet-handle" />
            <Drawer.Title className="picker-title">What are we playing?</Drawer.Title>

            <div className="console-sheet-body">
                <div className="console-sheet-branding">{platform.branding}</div>

                <div className="picker-search-wrap">
                    <span className="search-icon" aria-hidden="true">{SearchIcon}</span>
                    <input className="picker-search" type="search" aria-label="Search consoles"
                        placeholder="Search consoles..." value={search} onChange={event => setSearch(event.target.value)} />
                </div>
                <div className="picker-options">
                    {options.map(key => {
                        const option = PLATFORMS[key];
                        const photo = consolePhotos[key];
                        return (
                            <button key={key} className="picker-option playroom-press" aria-pressed={key === activeConsole}
                                onClick={() => selectConsole(key)}>
                                {photo && <img src={photo} alt="" />}
                                <span>{option.name}</span>
                            </button>
                        );
                    })}
                    {!options.length && <p>No matching consoles</p>}
                </div>

                {hasControls && (
                    <section className="console-sheet-footer" aria-label={`${platform.name} controls`}>
                        <div className="console-sheet-divider" />
                        <h3 className="console-sheet-actions-title">{platform.name} controls</h3>
                        <ConsoleControls activeConsole={activeConsole} />
                    </section>
                )}
            </div>
        </BottomSheet>
    );
}
