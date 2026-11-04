import { appStorage } from '../../lib/sharedStorage';
import { FavoriteBookmark, FavoriteStar } from '../collection/FavoriteBookmark';
import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { GameFormDrawer } from './GameFormDrawer';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

import { useAppContext } from '../../AppContext';
import { useRomPicker } from '../../hooks/useRomPicker';
import { useSaveSlots } from '../../hooks/useSaveSlots';
import type { LaunchBoxGame } from '../../types';
import { BackArrowIcon, BookIcon, FileIcon, PencilIcon, PlayIcon, ResetIcon } from '../../lib/icons';
import { getImageUrl, resolveImages, resolveScreenshots, resolveTitle } from '../../services/launchbox';
import { getGameOverrides, deleteGameOverrides, removeCustomGame } from '../../lib/storage';
import { EditGameForm } from './EditGameForm';
import { RomPicker } from './RomPicker';
import { OwnedGameAbout, OwnedGameSaves } from './OwnedGamePanels';
import { slotLabel } from './slotLabel';
import { getPreviewCover, getPreviewScreenshot } from '../collection/previewCovers';
import { PlayroomHeader } from '../../kit/PlayroomHeader';
import { LazyImage } from '../../kit/LazyImage';
import { PreviewBox } from './PreviewBox';
import './OwnedGamePage.css';

const tabs = [
    { key: 'main', label: 'About' },
    { key: 'library', label: 'Library' },
    { key: 'controls', label: 'Save / Load' },
] as const;

type GameTab = typeof tabs[number]['key'];
const GAME_TAB_KEY = 'owned_game_tab';

function isGameTab(value: string | null): value is GameTab {
    return tabs.some(tab => tab.key === value);
}

function readGameTab(): GameTab {
    try {
        const value = appStorage.getItem(GAME_TAB_KEY);
        if (isGameTab(value)) return value;
    } catch { /* localStorage unavailable */ }
    return 'main';
}

export function OwnedGamePage({ selectedGame, onClose }: {
    selectedGame: LaunchBoxGame;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState(readGameTab);
    const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
    const [boxOpen, setBoxOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { activeConsole, platform, api, connected, beatenIds, favoriteIds, toggleFavorite, removeFromCollection, unmarkAsBeaten } = useAppContext();
    const romPicker = useRomPicker(api, platform, selectedGame, activeConsole);
    const saves = useSaveSlots(api, selectedGame, activeConsole);
    const [editField, setEditField] = useState<'rom' | undefined>();

    const regions = platform.imageRegions;
    const images = resolveImages(selectedGame, regions);
    const overrides = getGameOverrides(selectedGame.id, activeConsole);
    const favorite = favoriteIds.includes(selectedGame.id);
    const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';
    const front = overrides.boxFrontUrl || (preview && getPreviewCover(activeConsole, selectedGame.id)) || (images.front && getImageUrl(images.front));
    const boxFront = preview && activeConsole === 'nes_ntsc' && selectedGame.id === '112'
        ? getPreviewCover(activeConsole, selectedGame.id) : undefined;
    const previewScreenshot = preview && getPreviewScreenshot(selectedGame.id);
    const screenshots = previewScreenshot ? [previewScreenshot] : resolveScreenshots(selectedGame).map(path => getImageUrl(path));
    const displayTitle = overrides.title || resolveTitle(selectedGame, platform.nameRegions);
    const library = [
        { title: 'Front cover', caption: 'The face of your collection', src: front, kind: 'front' },
        { title: 'Back cover', caption: 'One more side to the story', src: overrides.boxBackUrl || (images.back && getImageUrl(images.back)), kind: 'back' },
        { title: 'Cartridge', caption: 'The original adventure, in hand', src: overrides.cartridgeUrl, kind: 'cartridge' },
        { title: 'Manual', caption: 'Keep every little detail', src: overrides.manualPhotoUrl, kind: 'manual' },
    ];
    const slides = library.flatMap(item => item.src ? [{ src: item.src }] : []);
    const used = saves.saveSlots.filter(Boolean).length;
    const completedIndex = saves.saveSlots.findIndex(slot => slot?.beaten);
    const completed = completedIndex >= 0 || beatenIds.includes(selectedGame.id);
    const latestIndex = saves.saveSlots.reduce<number | null>((latest, slot, index) =>
        slot && (latest === null || Date.parse(slot.savedAt) > Date.parse(saves.saveSlots[latest]!.savedAt)) ? index : latest, null);
    const selectedIndex = activeTab === 'controls' && saves.saveSlots[saves.selectedSlot]
        ? saves.selectedSlot : null;
    const loadIndex = selectedIndex ?? latestIndex;

    function edit(field?: 'rom') {
        setEditField(field);
        setEditMode(true);
    }

    function closeEdit() {
        setEditMode(false);
    }

    function changeTab(value: string) {
        saves.resetSelection();
        if (!isGameTab(value)) return;
        setActiveTab(value);
        try {
            appStorage.setItem(GAME_TAB_KEY, value);
        } catch { /* localStorage unavailable */ }
    }

    function deleteGame() {
        removeFromCollection(selectedGame.id);
        unmarkAsBeaten(selectedGame.id);
        deleteGameOverrides(selectedGame.id, activeConsole);
        if (selectedGame.id.startsWith('custom_')) removeCustomGame(activeConsole, selectedGame.id);
        onClose();
    }

    return (
        <>
            <PlayroomHeader>
                <button className="owned-back" aria-label="Back to collection" onClick={onClose}>{BackArrowIcon} Back</button>
                <span className="owned-system" title={platform.branding || platform.name}>{platform.branding || platform.name}</span>
                <button className="owned-button owned-icon owned-edit-button playroom-press" aria-label="Edit game" onClick={() => edit()}>{PencilIcon}</button>
            </PlayroomHeader>
            <main className="owned-game-page page-scroll">
                <section className="playroom-stage owned-game-hero">
                    <div className="owned-hero-inner">
                        <div className="owned-cover">
                            <LazyImage src={front || undefined} alt="" />
                            {favorite && <FavoriteBookmark />}
                            {completed && <span className="owned-medal" aria-label="Completed" role="img">✓</span>}
                        </div>
                        <div>
                            <p className="owned-hero-meta">{[selectedGame.publisher, selectedGame.year].filter(Boolean).join(' · ')}</p>
                            <h1>{displayTitle}</h1>
                            <div className="owned-tags">
                                {!!selectedGame.maxPlayers && <span className="player-badge">{selectedGame.maxPlayers}P</span>}
                                {selectedGame.genre && <span className="owned-genre">{selectedGame.genre}</span>}
                            </div>
                            <button type="button" className="playroom-button playroom-press owned-favorite"
                                aria-label="Favorite" aria-pressed={favorite} onClick={() => toggleFavorite(selectedGame.id)}>
                                <FavoriteStar filled={favorite} />
                            </button>
                            {completed && <p className="owned-completed">✓ Completed{completedIndex >= 0 && ` · saved in Slot ${completedIndex + 1}`}</p>}
                        </div>
                    </div>
                </section>
                <Tabs.Root value={activeTab} onValueChange={changeTab}>
                    <div className="owned-tabs-bar">
                        <Tabs.List className="owned-tabs" aria-label="Game details">
                            {tabs.map(tab => (
                                <Tabs.Trigger key={tab.key} value={tab.key} className="owned-button owned-tab playroom-press">
                                    {tab.label}{tab.key === 'controls' && <span>{used}/4</span>}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>
                    </div>
                    <Tabs.Content value="main" className="owned-panel">
                        <OwnedGameAbout game={selectedGame} screenshots={screenshots} />
                    </Tabs.Content>
                    <Tabs.Content value="library" className="owned-panel">
                        <p className="owned-eyebrow">The little details</p>
                        <h2>In your collection</h2>
                        <div className="owned-library">
                            {library.map(({ title, caption, src, kind }, index) => (
                                <button key={kind} className="owned-library-card owned-button playroom-press"
                                    onClick={() => {
                                        if (!src) { edit(); return; }
                                        setGalleryIndex(library.slice(0, index).filter(item => item.src).length);
                                    }}>
                                    <span className="owned-library-top"><span>0{index + 1}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></span>
                                    <span className="owned-library-art">
                                        {src ? <LazyImage src={src} alt="" /> : <span className={`owned-placeholder owned-placeholder-${kind}`} aria-hidden="true">+</span>}
                                    </span>
                                    <strong>{title}</strong>
                                    <small>{caption}</small>
                                </button>
                            ))}
                        </div>
                        <div className="owned-library-tools">
                            {/*{boxFront && <button type="button" className="owned-button playroom-press" onClick={() => setBoxOpen(true)}>*/}
                            {/*    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">*/}
                            {/*        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9" />*/}
                            {/*    </svg>*/}
                            {/*    <span><strong>View in 3D</strong><small>Rotate and zoom the box</small></span><span aria-hidden="true">↗</span>*/}
                            {/*</button>}*/}
                            {overrides.manualUrl && <a className="owned-button owned-gold playroom-press" href={overrides.manualUrl} target="_blank" rel="noreferrer">{BookIcon}<span><strong>Open manual</strong><small>A little help for your adventure</small></span><span aria-hidden="true">↗</span></a>}
                            <button className="owned-button playroom-press" onClick={() => edit('rom')}>{FileIcon}<span><strong>Game file</strong><small>{overrides.romName || 'Link or change ROM'}</small></span><span aria-hidden="true">→</span></button>
                        </div>
                    </Tabs.Content>
                    <Tabs.Content value="controls" className="owned-panel">
                        <OwnedGameSaves gameId={selectedGame.id} saves={saves} previewScreenshot={previewScreenshot || undefined} />
                    </Tabs.Content>
                </Tabs.Root>
            </main>
            <aside className="owned-dock" aria-label="Play game">
                {loadIndex !== null && <button className="owned-button owned-new-game playroom-press" disabled={!connected || saves.loadingSlot} onClick={romPicker.handleLaunchGame}>{ResetIcon} Start new game</button>}
                <button className="owned-button owned-gold owned-primary playroom-press"
                    disabled={!connected || saves.loadingSlot || (loadIndex !== null && !saves.hasRomMapping)}
                    onClick={() => loadIndex === null ? romPicker.handleLaunchGame() : saves.loadSlot(loadIndex)}>
                    {PlayIcon}
                    <span>
                        {saves.loadingSlot ? 'Loading…' : selectedIndex !== null ? `Load · ${slotLabel(selectedIndex)}` : loadIndex !== null ? 'Continue' : 'Play'}
                        {activeTab === 'controls' && selectedIndex === null && loadIndex !== null && <small>Latest save · {slotLabel(loadIndex)}</small>}
                    </span>
                </button>
            </aside>
            <GameFormDrawer open={editMode} onOpenChange={setEditMode} title="Edit game"
                showClose autoFocus={editField !== 'rom'}>
                <EditGameForm game={selectedGame} regions={regions} activeConsole={activeConsole} initialField={editField}
                    onSave={closeEdit} onCancel={closeEdit} onDelete={deleteGame} />
            </GameFormDrawer>
            <Dialog.Root open={romPicker.romPickerOpen && !editMode} onOpenChange={open => {
                if (!open) romPicker.closeRomPicker();
            }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="owned-dialog-overlay" />
                    <Dialog.Content className="owned-dialog" aria-describedby={undefined}>
                        <Dialog.Title>Choose a game file</Dialog.Title>
                        <Dialog.Close className="owned-button owned-icon playroom-press" aria-label="Close">×</Dialog.Close>
                        <RomPicker {...romPicker} />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            {boxOpen && boxFront && <PreviewBox front={boxFront} back="/playroom/preview/mario3-back.jpg"
                title={displayTitle} onClose={() => setBoxOpen(false)} />}
            <Lightbox open={galleryIndex !== null} close={() => setGalleryIndex(null)} index={galleryIndex ?? 0} plugins={[Zoom]} slides={slides} />
        </>
    );
}
