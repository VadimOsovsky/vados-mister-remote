import { useCallback, useState } from 'react';
import { Drawer } from 'vaul';
import * as Tabs from '@radix-ui/react-tabs';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

import { useAppContext } from '../../AppContext';
import { useRomPicker } from '../../hooks/useRomPicker';
import type { LaunchBoxGame } from '../../types';
import { InfoIcon, BookIcon, PlusIcon } from '../../lib/icons';
import { getImageUrl, resolveImages, resolveScreenshots, resolveTitle } from '../../services/launchbox';
import { RomPicker } from '../game-sheet/RomPicker';
import '../../features/game-sheet/GameSheet.css';
import '../../features/game-sheet/MainTab.css';
import '../../features/game-sheet/LibraryTab.css';
import '../../features/game-sheet/RomPicker.css';

type StoreSheetTab = 'main' | 'library';

const TABS: { key: StoreSheetTab; label: string; icon: React.ReactNode }[] = [
    { key: 'main', label: 'Main', icon: InfoIcon },
    { key: 'library', label: 'Library', icon: BookIcon },
];

function StoreMainTab({ game, regions, onAdd, romPicker }: {
    game: LaunchBoxGame;
    regions: string[];
    onAdd: () => void;
    romPicker: {
        romPickerOpen: boolean;
        romSearchQuery: string;
        setRomSearchQuery: (q: string) => void;
        romSearchResults: import('../../services/wizzoApi').WizzoGameSearchResult[];
        romSearchLoading: boolean;
        romSearchError: string | null;
        closeRomPicker: () => void;
        selectRom: (r: import('../../services/wizzoApi').WizzoGameSearchResult) => void;
    };
}) {
    const { platform } = useAppContext();
    const images = resolveImages(game, regions);
    const frontSrc = images.front ? getImageUrl(images.front, 400) : undefined;

    return (
        <div className="sheet-panel">
            <div className="sheet-main-layout">
                <div className="sheet-art">
                    {frontSrc && <img src={frontSrc} alt={resolveTitle(game, platform.nameRegions)} />}
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
            <button className="sheet-btn sheet-btn-primary ctrl-launch-btn" onClick={onAdd}>
                {PlusIcon}
                <span>Add to Collection</span>
            </button>

            {romPicker.romPickerOpen && <RomPicker {...romPicker} />}
        </div>
    );
}

function StoreLibraryTab({ game, regions, onOpenGallery }: {
    game: LaunchBoxGame;
    regions: string[];
    onOpenGallery: (index: number) => void;
}) {
    const images = resolveImages(game, regions);
    const frontSrc = images.front ? getImageUrl(images.front, 400) : undefined;
    const backSrc = images.back ? getImageUrl(images.back, 400) : undefined;
    const screenshots = resolveScreenshots(game);

    // Gallery index offset: screenshots start after front + back covers
    const screenshotBaseIndex = (frontSrc ? 1 : 0) + (backSrc ? 1 : 0);

    return (
        <div className="sheet-panel">
            <div className="library-covers">
                <div
                    className={`library-cover${frontSrc ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (frontSrc) onOpenGallery(0); }}
                >
                    <div className="library-cover-label">Front</div>
                    <div className="library-cover-frame">
                        {frontSrc
                            ? <img src={frontSrc} alt="Front cover" />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
                <div
                    className={`library-cover${backSrc ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (backSrc) onOpenGallery(frontSrc ? 1 : 0); }}
                >
                    <div className="library-cover-label">Back</div>
                    <div className="library-cover-frame">
                        {backSrc
                            ? <img src={backSrc} alt="Back cover" />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
            </div>

            {screenshots.length > 0 && (
                <div className="library-screenshots">
                    <div className="library-screenshots-label">Screenshots</div>
                    <div className="library-screenshots-grid">
                        {screenshots.map((src, i) => (
                            <div
                                key={src}
                                className="library-screenshot"
                                onClick={() => onOpenGallery(screenshotBaseIndex + i)}
                            >
                                <div className="library-screenshot-frame">
                                    <img src={getImageUrl(src, 400)} alt={`Screenshot ${i + 1}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function buildGallerySlides(game: LaunchBoxGame, regions: string[]): { src: string }[] {
    const slides: { src: string }[] = [];
    const images = resolveImages(game, regions);
    if (images.front) slides.push({ src: getImageUrl(images.front) });
    if (images.back) slides.push({ src: getImageUrl(images.back) });
    for (const screenshot of resolveScreenshots(game)) {
        slides.push({ src: getImageUrl(screenshot) });
    }
    return slides;
}

export function StoreSheet({ selectedGame, onClose }: {
    selectedGame: LaunchBoxGame | null;
    onClose: () => void;
}) {
    const { activeConsole, platform, api, addToCollection } = useAppContext();
    const [tab, setTab] = useState<StoreSheetTab>('main');
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);

    const romPicker = useRomPicker(api, platform, selectedGame, activeConsole, useCallback(() => {
        if (selectedGame) {
            addToCollection(selectedGame.id);
        }
        onClose();
    }, [selectedGame, addToCollection, onClose]));

    // Reset rom picker when sheet closes (new game selected)
    const prevGameId = selectedGame?.id;
    const [lastGameId, setLastGameId] = useState(prevGameId);
    if (prevGameId !== lastGameId) {
        setLastGameId(prevGameId);
        if (romPicker.romPickerOpen) romPicker.closeRomPicker();
    }

    const regions = platform.imageRegions;
    const images = selectedGame ? resolveImages(selectedGame, regions) : undefined;
    const frontSrc = images?.front ? getImageUrl(images.front, 200) : undefined;

    function handleAdd() {
        if (selectedGame) {
            romPicker.openRomPicker(resolveTitle(selectedGame, platform.nameRegions));
        }
    }

    function handleOpenChange(open: boolean) {
        if (!open && !galleryOpen) onClose();
    }

    return (
        <>
            <Drawer.Root
                open={!!selectedGame}
                onOpenChange={handleOpenChange}
            >
                <Drawer.Portal>
                    <Drawer.Overlay className="sheet-overlay" />
                    <Drawer.Content className="sheet" aria-describedby={undefined}>
                        <div className="sheet-bg">
                            {frontSrc && <img src={frontSrc} alt="" className="sheet-bg-img" />}
                        </div>

                        <Drawer.Handle className="sheet-handle" />

                        <Drawer.Title className="sr-only">
                            {selectedGame ? resolveTitle(selectedGame, platform.nameRegions) : 'Game Details'}
                        </Drawer.Title>

                        {selectedGame && (
                            <div className="sheet-content">
                                <div className="sheet-title-bar">
                                    <div className="sheet-title">{resolveTitle(selectedGame, platform.nameRegions)}</div>
                                    <div className="sheet-subtitle">
                                        {selectedGame.year} · {selectedGame.genre}
                                    </div>
                                </div>

                                <Tabs.Root value={tab} onValueChange={(v) => setTab(v as StoreSheetTab)}>
                                    <Tabs.List className="sheet-tabs">
                                        {TABS.map((t) => (
                                            <Tabs.Trigger key={t.key} value={t.key} className="sheet-tab">
                                                {t.icon}
                                                <span>{t.label}</span>
                                            </Tabs.Trigger>
                                        ))}
                                    </Tabs.List>

                                    <Tabs.Content value="main">
                                        <StoreMainTab
                                            game={selectedGame}
                                            regions={regions}
                                            onAdd={handleAdd}
                                            romPicker={romPicker}
                                        />
                                    </Tabs.Content>

                                    <Tabs.Content value="library">
                                        <StoreLibraryTab
                                            game={selectedGame}
                                            regions={regions}
                                            onOpenGallery={(idx) => {
                                                setGalleryIndex(idx);
                                                setGalleryOpen(true);
                                            }}
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
