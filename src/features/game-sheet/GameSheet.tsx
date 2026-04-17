import { Drawer } from 'vaul';
import * as Tabs from '@radix-ui/react-tabs';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

import { useAppContext } from '../../AppContext';
import { useRomPicker } from '../../hooks/useRomPicker';
import { useSaveSlots } from '../../hooks/useSaveSlots';
import type { SheetTab } from '../../hooks/useGameSheet';
import type { SSGame } from '../../types';
import { InfoIcon, BookIcon, GamepadIcon } from '../../lib/icons';
import { resolveFrontThumb, buildGallerySlides } from '../../services/screenscraper';
import { MainTab } from './MainTab';
import { LibraryTab } from './LibraryTab';
import { ControlsTab } from './ControlsTab';
import './GameSheet.css';

const SHEET_TABS: { key: SheetTab; label: string; icon: React.ReactNode }[] = [
    { key: 'main', label: 'Main', icon: InfoIcon },
    { key: 'library', label: 'Library', icon: BookIcon },
    { key: 'controls', label: 'Controls', icon: GamepadIcon },
];

export function GameSheet({ selectedGame, sheetTab, setSheetTab, galleryOpen, setGalleryOpen, galleryIndex, setGalleryIndex, onClose }: {
    selectedGame: SSGame | null;
    sheetTab: SheetTab;
    setSheetTab: (tab: SheetTab) => void;
    galleryOpen: boolean;
    setGalleryOpen: (open: boolean) => void;
    galleryIndex: number;
    setGalleryIndex: (index: number) => void;
    onClose: () => void;
}) {
    const { activeConsole, platform, api, connected } = useAppContext();
    const romPicker = useRomPicker(api, platform, selectedGame, activeConsole);
    const saveState = useSaveSlots(api, selectedGame, activeConsole, sheetTab);

    const regions = platform.mediaRegions;
    const front = selectedGame ? resolveFrontThumb(selectedGame, regions) : undefined;

    return (
        <>
            <Drawer.Root
                open={!!selectedGame}
                onOpenChange={(open) => { if (!open) onClose(); }}
            >
                <Drawer.Portal>
                    <Drawer.Overlay className="sheet-overlay" />
                    <Drawer.Content className="sheet" aria-describedby={undefined}>
                        <div className="sheet-bg">
                            {front && <img src={front.src} alt="" className="sheet-bg-img" />}
                        </div>

                        <Drawer.Handle className="sheet-handle" />

                        <Drawer.Title className="sr-only">
                            {selectedGame?.name ?? 'Game Details'}
                        </Drawer.Title>

                        {selectedGame && (
                            <div className="sheet-content">
                                <div className="sheet-title-bar">
                                    <div className="sheet-title">{selectedGame.name}</div>
                                    <div className="sheet-subtitle">
                                        {String(selectedGame.releaseDate ?? '').substring(0, 4)} · {selectedGame.genre}
                                    </div>
                                </div>

                                <Tabs.Root value={sheetTab} onValueChange={(v) => setSheetTab(v as SheetTab)}>
                                    <Tabs.List className="sheet-tabs">
                                        {SHEET_TABS.map((t) => (
                                            <Tabs.Trigger key={t.key} value={t.key} className="sheet-tab">
                                                {t.icon}
                                                <span>{t.label}</span>
                                            </Tabs.Trigger>
                                        ))}
                                    </Tabs.List>

                                    <Tabs.Content value="main">
                                        <MainTab
                                            game={selectedGame}
                                            regions={regions}
                                            connected={connected}
                                            romPicker={romPicker}
                                            onLaunch={romPicker.handleLaunchGame}
                                        />
                                    </Tabs.Content>

                                    <Tabs.Content value="library">
                                        <LibraryTab
                                            game={selectedGame}
                                            regions={regions}
                                            onOpenGallery={(idx) => {
                                                setGalleryIndex(idx);
                                                setGalleryOpen(true);
                                            }}
                                        />
                                    </Tabs.Content>

                                    <Tabs.Content value="controls">
                                        <ControlsTab
                                            api={api}
                                            saveState={saveState}
                                        />
                                    </Tabs.Content>
                                </Tabs.Root>
                            </div>
                        )}
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <Lightbox
                open={galleryOpen}
                close={() => setGalleryOpen(false)}
                index={galleryIndex}
                plugins={[Zoom]}
                slides={selectedGame ? buildGallerySlides(selectedGame, regions) : []}
            />
        </>
    );
}
