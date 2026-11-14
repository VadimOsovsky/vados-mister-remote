import { appStorage, subscribeToValues } from '../../lib/sharedStorage';
import { FavoriteStar } from '../collection/FavoriteBookmark';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { GameFormDrawer } from './GameFormDrawer';
import { PhotoViewer } from '../../kit/PhotoViewer';
import { GameBackdrop } from '../../kit/GameBackdrop';

import { useCollectionState, usePlatform } from '../../state/collectionState';
import { useMisterState, useIsGamePlaying } from '../../state/misterState';
import { useRomPicker } from '../../hooks/useRomPicker';
import { useSaveSlots } from '../../hooks/useSaveSlots';
import type { LaunchBoxGame } from '../../types';
import type { WizzoGameSearchResult } from '../../services/wizzoApi';
import { BackArrowIcon, FlipDiskIcon, FileIcon, PencilIcon, PlayIcon, ResetIcon } from '../../lib/icons';
import { getImageUrl, resolveImages, resolveScreenshots, resolveTitle } from '../../services/launchbox';
import { getGameArtworkLanguage, getGameOverrides, deleteGameOverrides, getRomMapping, removeCustomGame, setRomMapping } from '../../lib/storage';
import { readCheatSelection } from '../../services/gameCheats';
import { launchCollectionGame } from '../../services/collectionLauncher';
import { isRomPlaying } from '../../services/nowPlaying';
import { resolveGameArtwork } from '../../lib/gameArtwork';
import { EditGameForm } from './EditGameForm';
import { RomPicker } from './RomPicker';
import { GameLanguages } from './GameLanguages';
import { OwnedGameAbout, OwnedGameSaves } from './OwnedGamePanels';
import { OwnedGameCheats } from './OwnedGameCheats';
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
    { key: 'cheats', label: 'Cheats' },
] as const;

type GameTab = typeof tabs[number]['key'];
const GAME_TAB_KEY = 'owned_game_tab';
const stopIcon = <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
</svg>;

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

export function OwnedGamePage(props: { selectedGame: LaunchBoxGame; onClose: () => void }) {
    const [revision, setRevision] = useState(0);
    const activeConsole = useCollectionState(state => state.activeConsole);
    return <OwnedGameContent key={activeConsole + props.selectedGame.id + '_' + revision} {...props}
        onVersionChange={() => setRevision(value => value + 1)} />;
}
function OwnedGameContent({ selectedGame, onClose, onVersionChange }: {
    onVersionChange: () => void;
    selectedGame: LaunchBoxGame;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState(readGameTab);
    const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
    const [boxOpen, setBoxOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [flippingDisk, setFlippingDisk] = useState(false);
    const [flipError, setFlipError] = useState<string>();
    const [gameAction, setGameAction] = useState<'exit' | 'restart' | null>(null);
    const actionTrigger = useRef<HTMLButtonElement | null>(null);
    const restarting = gameAction === 'restart';
    const [actionPending, setActionPending] = useState(false);
    const [actionError, setActionError] = useState<string>();
    const activeConsole = useCollectionState(state => state.activeConsole);
    const platform = usePlatform();
    const hasSelectedCheats = useSyncExternalStore(subscribeToValues, () => {
        const rom = getRomMapping(selectedGame.id, activeConsole);
        return Boolean(rom && readCheatSelection(activeConsole, rom).length);
    });
    const api = useMisterState(state => state.api);
    const connected = useMisterState(state => state.connected);
    const beatenIds = useCollectionState(state => state.beatenIds);
    const favoriteIds = useCollectionState(state => state.favoriteIds);
    const toggleFavorite = useCollectionState(state => state.toggleFavorite);
    const removeFromCollection = useCollectionState(state => state.removeFromCollection);
    const unmarkAsBeaten = useCollectionState(state => state.unmarkAsBeaten);
    const playing = useIsGamePlaying(selectedGame.id, activeConsole);
    const hasFlipDisk = platform.controls?.some(control => control.id === 'flip_disk');
    const romPicker = useRomPicker(api, platform, selectedGame, activeConsole);
    const { romPickerOpen, romSearchError, clearRomSearchError } = romPicker;
    useEffect(() => {
        if (romPickerOpen || !romSearchError) return;
        const timer = window.setTimeout(clearRomSearchError, 3000);
        return () => window.clearTimeout(timer);
    }, [romPickerOpen, romSearchError, clearRomSearchError]);
    const saves = useSaveSlots(api, selectedGame, activeConsole);
    const pendingLoadSlot = useRef<number | null>(null);
    const [editField, setEditField] = useState<'rom' | undefined>();

    const regions = platform.imageRegions;
    const images = resolveImages(selectedGame, regions);
    const overrides = getGameOverrides(selectedGame.id, activeConsole);
    const artwork = resolveGameArtwork(overrides, getGameArtworkLanguage(selectedGame.id, activeConsole));
    const [artworkLanguage, setArtworkLanguage] = useState(() => getGameArtworkLanguage(selectedGame.id, activeConsole));
    const artworkLanguages = Object.entries(overrides.artworkByLanguage ?? {}).filter(([, value]) => Object.values(value).some(Boolean)).map(([language]) => language);
    const libraryLanguage = artworkLanguages.includes(artworkLanguage) ? artworkLanguage : 'original';
    const libraryArtwork = resolveGameArtwork(overrides, libraryLanguage);
    const favorite = favoriteIds.includes(selectedGame.id);
    const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1';
    const frontOverride = artwork.boxFrontUrl || (preview && getPreviewCover(activeConsole, selectedGame.id));
    const front = frontOverride || (images.front && getImageUrl(images.front));
    const frontPreview = frontOverride || (images.front && getImageUrl(images.front, 300));
    const boxFront = preview && activeConsole === 'nes_ntsc' && selectedGame.id === '112'
        ? getPreviewCover(activeConsole, selectedGame.id) : undefined;
    const previewScreenshot = preview && getPreviewScreenshot(selectedGame.id);
    const screenshots = previewScreenshot ? [previewScreenshot] : resolveScreenshots(selectedGame).map(path => getImageUrl(path));
    const displayTitle = overrides.title || resolveTitle(selectedGame, platform.nameRegions);
    const library = [
        { title: 'Front cover', caption: 'The face of your collection', src: libraryArtwork.boxFrontUrl || (preview && getPreviewCover(activeConsole, selectedGame.id)) || (images.front && getImageUrl(images.front)), kind: 'front' },
        { title: 'Back cover', caption: 'One more side to the story', src: libraryArtwork.boxBackUrl || (images.back && getImageUrl(images.back)), kind: 'back' },
        { title: platform.mediaLabel, caption: 'The original adventure, in hand', src: libraryArtwork.cartridgeUrl, kind: 'cartridge' },
        { title: 'Manual', caption: 'Keep every little detail', src: libraryArtwork.manualPhotoUrl, kind: 'manual' },
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
    const actionsBusy = !connected || saves.savingSlot || saves.loadingSlot || flippingDisk;
    const showExit = playing && selectedIndex === null;

    async function runGameAction() {
        if (actionsBusy || actionPending || !gameAction) return;
        setActionPending(true);
        setActionError(undefined);
        try {
            const rom = getRomMapping(selectedGame.id, activeConsole);
            const current = await api.getPlaying(AbortSignal.timeout(5000));
            if (useMisterState.getState().api !== api || !rom || !isRomPlaying(current, rom, activeConsole)) {
                setActionError('This game is no longer running on the connected MiSTer.');
                return;
            }
            if (restarting) await launchCollectionGame(api, activeConsole, selectedGame.id, rom);
            else await api.launchMenu();
            setGameAction(null);
        } catch (error) {
            setActionError(restarting
                ? (error instanceof Error ? error.message : 'Could not restart the game. Try again.')
                : 'Could not return to the MiSTer menu. Try again.');
        } finally {
            setActionPending(false);
        }
    }

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

    async function flipDisk() {
        if (!connected || !playing || flippingDisk || saves.loadingSlot) return;
        setFlippingDisk(true);
        setFlipError(undefined);
        try {
            await api.flipDisk();
            navigator.vibrate?.(10);
        } catch {
            setFlipError('Could not flip the disk. Try again.');
        } finally {
            setFlippingDisk(false);
        }
    }

    function closeGameRomPicker() {
        pendingLoadSlot.current = null;
        romPicker.closeRomPicker();
    }

    function startNewGame() {
        pendingLoadSlot.current = null;
        void romPicker.handleLaunchGame();
    }

    function continueGame() {
        if (loadIndex === null) {
            startNewGame();
        } else if (saves.hasRomMapping) {
            void saves.loadSlot(loadIndex);
        } else {
            pendingLoadSlot.current = loadIndex;
            romPicker.openRomPicker(displayTitle);
        }
    }

    async function selectGameRom(result: WizzoGameSearchResult) {
        const slot = pendingLoadSlot.current;
        if (slot === null) {
            await romPicker.selectRom(result);
            return;
        }
        setRomMapping(selectedGame.id, activeConsole, result.path);
        closeGameRomPicker();
        await saves.loadSlot(slot);
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
                    <GameBackdrop src={screenshots[0]} />
                    <div className="owned-hero-inner">
                        <button type="button" className="owned-cover" aria-label="View front cover" disabled={!front} onClick={() => setGalleryIndex(-1)}>
                            <LazyImage src={frontPreview || undefined} fallbackSrc={front || undefined} alt="" priority />
                            {completed && <span className="owned-medal" aria-label="Completed" role="img">✓</span>}
                        </button>
                        <div className="owned-hero-copy">
                            <p className="owned-hero-status owned-hero-extra" data-playing={playing || undefined}>{playing ? 'Now playing' : 'In your collection'}</p>
                            <h1>{displayTitle}</h1>
                            {[selectedGame.publisher, selectedGame.year].some(Boolean) && <p className="owned-hero-meta">{[selectedGame.publisher, selectedGame.year].filter(Boolean).join(' · ')}</p>}
                            <div className="owned-hero-facts owned-hero-extra">
                                {!!selectedGame.maxPlayers && <span>{selectedGame.maxPlayers} {selectedGame.maxPlayers === '1' ? 'player' : 'players'}</span>}
                                {selectedGame.genre && <span>{selectedGame.genre}</span>}
                                {completed && <span className="owned-hero-completed">✓ Completed{completedIndex >= 0 && ' · Slot ' + (completedIndex + 1)}</span>}
                            </div>
                            <div className="owned-hero-actions">
                                <GameLanguages game={selectedGame} disabled={saves.savingSlot || saves.loadingSlot || flippingDisk} onChange={onVersionChange} />
                            <button type="button" className="playroom-button playroom-press owned-favorite"
                                title={favorite ? 'Remove from favorites' : 'Add to favorites'} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={favorite} onClick={() => toggleFavorite(selectedGame.id)}>
                                <FavoriteStar filled={favorite} /><span>{favorite ? 'Favorited' : 'Favorite'}</span>
                            </button>
                            </div>
                        </div>
                    </div>
                </section>
                <Tabs.Root value={activeTab} onValueChange={changeTab}>
                    <div className="owned-tabs-bar">
                        <Tabs.List className="owned-tabs" aria-label="Game details">
                            {tabs.map(tab => (
                                <Tabs.Trigger key={tab.key} value={tab.key} className="owned-button owned-tab playroom-press">
                                    {tab.label}{tab.key === 'controls' && <span>{used}/4</span>}
                                    {tab.key === 'cheats' && hasSelectedCheats &&
                                        <span className="owned-cheat-badge" aria-label="Cheats selected">✦</span>}
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>
                    </div>
                    <Tabs.Content value="main" className="owned-panel">
                        <OwnedGameAbout game={selectedGame} screenshots={screenshots} />
                    </Tabs.Content>
                    <Tabs.Content value="library" className="owned-panel">
                        <p className="owned-eyebrow">The little details</p>
                        <div className="artwork-library-heading"><h2>In your collection</h2>
                            {artworkLanguages.length > 0 && <label className="artwork-library-language">Materials
                                <select value={libraryLanguage} onChange={event => { setArtworkLanguage(event.target.value); setGalleryIndex(null); }}>
                                    <option value="original">Original</option>
                                    {artworkLanguages.map(language => <option key={language} value={language}>{language}</option>)}
                                </select>
                            </label>}
                        </div>
                        <div className="owned-library">
                            {library.map(({ title, caption, src, kind }, index) => {
                                const content = <>
                                    <span className="owned-library-top"><span>0{index + 1}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></span>
                                    <span className="owned-library-art">
                                        {src ? <LazyImage src={src} alt="" /> : <span className={`owned-placeholder owned-placeholder-${kind}`} aria-hidden="true">+</span>}
                                    </span>
                                    <strong>{title}</strong>
                                    <small>{caption}</small>
                                </>;
                                const className = 'owned-library-card owned-button playroom-press';
                                if (kind === 'manual' && libraryArtwork.manualUrl) {
                                    return <a key={kind} className={className} href={libraryArtwork.manualUrl} target="_blank" rel="noreferrer">{content}</a>;
                                }
                                return <button key={kind} className={className}
                                    onClick={() => {
                                        if (!src) { edit(); return; }
                                        setGalleryIndex(library.slice(0, index).filter(item => item.src).length);
                                    }}>{content}</button>;
                            })}
                        </div>
                        <div className="owned-library-tools">
                            {overrides.webManualUrl && <a className="owned-button playroom-press" href={overrides.webManualUrl} target="_blank" rel="noopener noreferrer">{FileIcon}<span><strong>Web manual</strong><small>Read in your browser</small></span><span aria-hidden="true">↗</span></a>}
                            {/*{boxFront && <button type="button" className="owned-button playroom-press" onClick={() => setBoxOpen(true)}>*/}
                            {/*    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">*/}
                            {/*        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9" />*/}
                            {/*    </svg>*/}
                            {/*    <span><strong>View in 3D</strong><small>Rotate and zoom the box</small></span><span aria-hidden="true">↗</span>*/}
                            {/*</button>}*/}
                            <button className="owned-button playroom-press" onClick={() => edit('rom')}>{FileIcon}<span><strong>Game file</strong><small>{overrides.romName || 'Link or change ROM'}</small></span><span aria-hidden="true">→</span></button>
                        </div>
                    </Tabs.Content>
                    <Tabs.Content value="controls" className="owned-panel">
                        <OwnedGameSaves gameId={selectedGame.id} title={selectedGame.title} saves={saves} previewScreenshot={previewScreenshot || undefined} />
                    </Tabs.Content>
                    <Tabs.Content value="cheats" className="owned-panel">
                        {activeTab === 'cheats' && <OwnedGameCheats gameId={selectedGame.id} consoleKey={activeConsole} onLink={() => edit('rom')} />}
                    </Tabs.Content>
                </Tabs.Root>
            </main>
            <aside className="owned-dock" aria-label="Game actions" data-has-flip={hasFlipDisk || undefined}>
                {!romPickerOpen && romSearchError && <p className="owned-flip-error" role="alert">{romSearchError}</p>}
                {flipError && <p className="owned-flip-error" role="alert">{flipError}</p>}
                {!showExit && loadIndex !== null && <button className="owned-button owned-new-game playroom-press" aria-label={hasSelectedCheats ? 'Start new game with selected cheats' : 'Start new game'} title="Start new game" disabled={!connected || saves.savingSlot || saves.loadingSlot || flippingDisk} onClick={startNewGame}>{ResetIcon}<span>Start new game</span>
                    {hasSelectedCheats && <span className="owned-cheat-badge" aria-hidden="true">✦</span>}
                </button>}
                <Dialog.Root open={gameAction !== null} onOpenChange={open => {
                    if (actionPending) return;
                    setActionError(undefined);
                    if (!open) setGameAction(null);
                }}>
                    {showExit && <>
                        <button className="owned-button owned-new-game playroom-press"
                            aria-label="Restart game" title="Restart game" disabled={actionsBusy || actionPending}
                            onClick={event => { actionTrigger.current = event.currentTarget; setGameAction('restart'); }}>
                            {ResetIcon}<span>Restart</span>
                        </button>
                        <button className="owned-button owned-primary owned-exit-button playroom-press"
                            disabled={actionsBusy || actionPending} onClick={event => { actionTrigger.current = event.currentTarget; setGameAction('exit'); }}>
                            {stopIcon}<span>Exit game</span>
                        </button>
                    </>}
                    <Dialog.Portal>
                        <Dialog.Overlay className="owned-dialog-overlay" />
                        <Dialog.Content className="owned-dialog owned-confirm owned-exit-dialog"
                            onCloseAutoFocus={event => {
                                if (!actionTrigger.current?.isConnected) return;
                                event.preventDefault();
                                actionTrigger.current.focus();
                            }}>
                            <span className="owned-exit-icon">{restarting ? ResetIcon : stopIcon}</span>
                            <Dialog.Title>{restarting ? 'Restart game?' : 'Exit game?'}</Dialog.Title>
                            <Dialog.Description>
                                <strong>{displayTitle}</strong> {restarting ? 'will restart from the beginning.' : 'will close and MiSTer will return to its main menu.'} Unsaved progress will be lost.
                            </Dialog.Description>
                            {actionError && <p role="alert" className="owned-exit-error">{actionError}</p>}
                            <div className="owned-exit-actions">
                                <Dialog.Close className="owned-button playroom-press" disabled={actionPending}>Cancel</Dialog.Close>
                                <button className="owned-button owned-exit-button playroom-press"
                                    disabled={!!actionsBusy || actionPending} onClick={runGameAction}>
                                    {restarting ? (actionPending ? 'Restarting…' : 'Restart game') : (actionPending ? 'Exiting…' : 'Exit game')}
                                </button>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
                {!showExit && <button className="owned-button owned-gold owned-primary playroom-press"
                    disabled={!!actionsBusy}
                    onClick={continueGame}>
                    {PlayIcon}
                    <span>
                        {saves.loadingSlot ? 'Loading…' : selectedIndex !== null ? `Load · ${slotLabel(selectedIndex)}` : loadIndex !== null ? 'Continue' : 'Play'}
                    </span>
                    {!playing && hasSelectedCheats && <span className="owned-cheat-badge"
                        title="Cheats selected for next launch" aria-label="Cheats selected">✦</span>}
                </button>}
                {hasFlipDisk && <button className="owned-button owned-flip-disk playroom-press"
                    disabled={!connected || !playing || saves.loadingSlot || flippingDisk}
                    aria-label="Flip Disk" aria-busy={flippingDisk}
                    title={playing ? 'Flip Disk' : 'Launch this game to flip the disk'} onClick={flipDisk}>
                    {FlipDiskIcon}
                </button>}
            </aside>
            <GameFormDrawer open={editMode} onOpenChange={setEditMode} title="Edit game"
                showClose autoFocus={editField !== 'rom'}>
                <EditGameForm game={selectedGame} regions={regions} activeConsole={activeConsole} initialField={editField}
                    onSave={closeEdit} onCancel={closeEdit} onDelete={deleteGame} />
            </GameFormDrawer>
            <Dialog.Root open={romPicker.romPickerOpen && !editMode} onOpenChange={open => {
                if (!open) closeGameRomPicker();
            }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="owned-dialog-overlay" />
                    <Dialog.Content className="owned-dialog" aria-describedby={undefined}>
                        <Dialog.Title>Choose a game file</Dialog.Title>
                        <Dialog.Close className="owned-button owned-icon playroom-press" aria-label="Close">×</Dialog.Close>
                        <RomPicker {...romPicker} selectRom={selectGameRom} closeRomPicker={closeGameRomPicker} />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            {boxOpen && boxFront && <PreviewBox front={boxFront} back="/playroom/preview/mario3-back.jpg"
                title={displayTitle} onClose={() => setBoxOpen(false)} />}
            <PhotoViewer index={galleryIndex === -1 ? 0 : galleryIndex} onClose={() => setGalleryIndex(null)} slides={galleryIndex === -1 ? [{ src: front || '' }] : slides} />
        </>
    );
}
