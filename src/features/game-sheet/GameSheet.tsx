import { Drawer } from 'vaul';
import * as Tabs from '@radix-ui/react-tabs';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

import { useAppContext } from '../../AppContext';
import { useRomPicker } from '../../hooks/useRomPicker';
import { useSaveSlots } from '../../hooks/useSaveSlots';
import type { SheetTab } from '../../hooks/useGameSheet';
import type { LaunchBoxGame } from '../../types';
import { InfoIcon, BookIcon, SaveIcon, PencilIcon } from '../../lib/icons';
import { getImageUrl, resolveImages } from '../../services/launchbox';
import { getGameOverrides, deleteGameOverrides } from '../../lib/storage';
import { MainTab } from './MainTab';
import { LibraryTab } from './LibraryTab';
import { ControlsTab } from './ControlsTab';
import { EditGameForm } from './EditGameForm';
import './GameSheet.css';

const SHEET_TABS: { key: SheetTab; label: string; icon: React.ReactNode }[] = [
    { key: 'main', label: 'Main', icon: InfoIcon },
    { key: 'library', label: 'Library', icon: BookIcon },
    { key: 'controls', label: 'Save/Load', icon: SaveIcon },
];

function buildGallerySlides(game: LaunchBoxGame, regions: string[], activeConsole: string): { src: string }[] {
    const slides: { src: string }[] = [];
    const overrides = getGameOverrides(game.id, activeConsole as import('../../types').ConsoleKey);
    const images = resolveImages(game, regions);

    const front = overrides.boxFrontUrl || (images.front ? getImageUrl(images.front) : undefined);
    const back = overrides.boxBackUrl || (images.back ? getImageUrl(images.back) : undefined);
    const cartridge = overrides.cartridgeUrl;
    const manualPhoto = overrides.manualPhotoUrl;

    if (front) slides.push({ src: front });
    if (back) slides.push({ src: back });
    if (cartridge) slides.push({ src: cartridge });
    if (manualPhoto) slides.push({ src: manualPhoto });
    return slides;
}

export function GameSheet({ selectedGame, sheetTab, setSheetTab, galleryOpen, setGalleryOpen, galleryIndex, setGalleryIndex, editMode, setEditMode, onClose }: {
    selectedGame: LaunchBoxGame | null;
    sheetTab: SheetTab;
    setSheetTab: (tab: SheetTab) => void;
    galleryOpen: boolean;
    setGalleryOpen: (open: boolean) => void;
    galleryIndex: number;
    setGalleryIndex: (index: number) => void;
    editMode: boolean;
    setEditMode: (edit: boolean) => void;
    onClose: () => void;
}) {
    const { activeConsole, platform, api, connected, removeFromCollection, unmarkAsBeaten } = useAppContext();
    const romPicker = useRomPicker(api, platform, selectedGame, activeConsole);
    const saveState = useSaveSlots(api, selectedGame, sheetTab);

    const regions = platform.imageRegions;
    const images = selectedGame ? resolveImages(selectedGame, regions) : undefined;
    const frontSrc = images?.front ? getImageUrl(images.front, 200) : undefined;

    const overrides = selectedGame ? getGameOverrides(selectedGame.id, activeConsole) : {};
    const displayTitle = overrides.title || selectedGame?.title || 'Game Details';

    return (
        <>
            <Drawer.Root
                open={!!selectedGame}
                onOpenChange={(open) => { if (!open && !galleryOpen) onClose(); }}
            >
                <Drawer.Portal>
                    <Drawer.Overlay className="sheet-overlay" />
                    <Drawer.Content className="sheet" aria-describedby={undefined}>
                        <div className="sheet-bg">
                            {frontSrc && <img src={frontSrc} alt="" className="sheet-bg-img" />}
                        </div>

                        <Drawer.Handle className="sheet-handle" />

                        <Drawer.Title className="sr-only">
                            {displayTitle}
                        </Drawer.Title>

                        {selectedGame && (
                            <div className="sheet-content">
                                <div className="sheet-title-bar">
                                    <div className="sheet-title-row">
                                        <div className="sheet-title">{displayTitle}</div>
                                        {!editMode && (
                                            <button className="sheet-edit-btn" onClick={() => setEditMode(true)}>
                                                {PencilIcon}
                                            </button>
                                        )}
                                    </div>
                                    <div className="sheet-subtitle">
                                        {selectedGame.year} · {selectedGame.genre}
                                    </div>
                                </div>

                                {editMode ? (
                                    <EditGameForm
                                        game={selectedGame}
                                        regions={regions}
                                        activeConsole={activeConsole}
                                        onSave={() => setEditMode(false)}
                                        onCancel={() => setEditMode(false)}
                                        onDelete={() => {
                                            removeFromCollection(selectedGame.id);
                                            unmarkAsBeaten(selectedGame.id);
                                            deleteGameOverrides(selectedGame.id, activeConsole);
                                            onClose();
                                        }}
                                    />
                                ) : (
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
                                                activeConsole={activeConsole}
                                                onOpenGallery={(idx) => {
                                                    setGalleryIndex(idx);
                                                    setGalleryOpen(true);
                                                }}
                                            />
                                        </Tabs.Content>

                                        <Tabs.Content value="controls">
                                            <ControlsTab
                                                api={api}
                                                gameId={selectedGame.id}
                                                saveState={saveState}
                                            />
                                        </Tabs.Content>
                                    </Tabs.Root>
                                )}
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
                slides={selectedGame ? buildGallerySlides(selectedGame, regions, activeConsole) : []}
            />
        </>
    );
}
