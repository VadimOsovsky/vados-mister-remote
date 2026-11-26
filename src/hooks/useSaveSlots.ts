import { useCallback, useState } from 'react';
import type { ConsoleKey, LaunchBoxGame, SaveSlot } from '../types';
import type { WizzoApi } from '../services/wizzoApi';
import { getRomVersions, getGameSaveKey, getOriginalGameSaveKey, getSaveSlots, putSaveSlot, deleteSaveSlot, getRomMapping, isGalleryScreenshot, isSaveSlotScreenshot } from '../lib/storage';
import { confirmSharedStorageWrites } from '../lib/sharedStorage';
import { loadCollectionSave } from '../services/collectionLauncher';
import { isRomPlaying } from '../services/nowPlaying';
import { captureScreenshot } from '../services/misterScreenshots';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function removeUnusedSaveScreenshot(api: WizzoApi, slot: SaveSlot | null) {
    const core = slot?.screenshotCore;
    const filename = slot?.screenshotFilename;
    if (!core || !filename) return;
    if (!await confirmSharedStorageWrites()) throw new Error('Save slot changes could not be synced.');
    if (isSaveSlotScreenshot(core, filename) || isGalleryScreenshot(core, filename)) return;
    await api.deleteScreenshot(core, filename, AbortSignal.timeout(5000));
}

async function readSaveVersion(query: URLSearchParams): Promise<string | null> {
    const response = await fetch(`/api/playroom/save-state?${query}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not check the save file on MiSTer.');
    return (await response.json()).version;
}

export function useSaveSlots(api: WizzoApi, game: LaunchBoxGame, activeConsole: ConsoleKey) {
    const saveKey = getGameSaveKey(game.id, activeConsole);
    const [selectedSlot, setSelectedSlot] = useState(0);
    const [saveSlots, setSaveSlots] = useState(() => getSaveSlots(saveKey));
    const [savingSlot, setSavingSlot] = useState(false);
    const [saveError, setSaveError] = useState<string>();

    const hasCompletedVersion = useCallback(() => {
        const paths = getRomVersions(game.id, activeConsole).translations.map(v => v.path);
        return [getOriginalGameSaveKey(game.id, activeConsole), ...paths.map(path => game.id + '_translation_' + activeConsole + '_' + encodeURIComponent(path))]
            .some(key => getSaveSlots(key).some(slot => slot?.beaten));
    }, [game.id, activeConsole]);

    function resetSelection() {
        setSaveSlots(getSaveSlots(saveKey));
        setSelectedSlot(0);
    }

    const handleToggleLock = useCallback(() => {
        if (!saveSlots[selectedSlot]) return;
        const slot = saveSlots[selectedSlot]!;
        const updated = putSaveSlot(saveKey, selectedSlot, { ...slot, locked: !slot.locked });
        setSaveSlots(updated);
    }, [saveKey, selectedSlot, saveSlots]);

    const handleSave = useCallback(async () => {
        if (savingSlot) return;
        if (getSaveSlots(saveKey)[selectedSlot]?.locked) return;
        setSavingSlot(true);
        setSaveError(undefined);
        try {
            const playing = await api.getPlaying();
            if (!playing?.gameName || !playing.core) throw new Error('Start the game on MiSTer first.');
            if (!isRomPlaying(playing, getRomMapping(game.id, activeConsole), activeConsole)) {
                throw new Error('Launch this game on MiSTer before saving.');
            }
            const query = new URLSearchParams({
                core: playing.core,
                // The core names the save after the ROM inside the MGL.
                game: playing.romPath
                    ? playing.romPath.replace(/\\/g, '/').split('/').pop()!.replace(/\.[^.]+$/, '')
                    : playing.gameName,
                slot: String(selectedSlot + 1),
            });
            const verifyOnDisk = !import.meta.env.DEV && api.host === window.location.hostname;
            const previousVersion = verifyOnDisk ? await readSaveVersion(query) : null;
            await api.saveState(selectedSlot);

            if (verifyOnDisk) {
                let version = previousVersion;
                for (let attempt = 0; attempt < 10 && version === previousVersion; attempt++) {
                    await wait(500);
                    version = await readSaveVersion(query);
                }
                if (!version || version === previousVersion) {
                    throw new Error('MiSTer did not write a save file. Check “Savestates to SDCard” in the core menu.');
                }
            } else {
                await wait(500);
            }

            const slot: SaveSlot = {
                slotIndex: selectedSlot,
                savedAt: new Date().toISOString(),
                gameName: game.title,
            };
            try {
                const screenshot = await captureScreenshot(api, playing);
                slot.screenshotCore = screenshot.core;
                slot.screenshotFilename = screenshot.filename;
            } catch (err) {
                console.warn('Save screenshot failed:', err);
            }
            if (!verifyOnDisk && !slot.screenshotFilename) {
                throw new Error('Could not confirm the save on MiSTer.');
            }
            const oldSlot = getSaveSlots(saveKey)[selectedSlot];
            setSaveSlots(putSaveSlot(saveKey, selectedSlot, slot));
            try {
                await removeUnusedSaveScreenshot(api, oldSlot);
            } catch (err) {
                console.warn('Save screenshot cleanup failed:', err);
                setSaveError('The save was overwritten, but its previous screenshot could not be removed.');
            }
        } catch (err) {
            console.warn('Save state failed:', err);
            setSaveError(err instanceof Error ? err.message : 'Could not save on MiSTer.');
        } finally {
            setSavingSlot(false);
        }
    }, [saveKey, selectedSlot, game, savingSlot, api, activeConsole]);

    const [loadingSlot, setLoadingSlot] = useState(false);
    const hasRomMapping = Boolean(getRomMapping(game.id, activeConsole));

    const loadSlot = useCallback(async (slotIndex: number | null) => {
        if (slotIndex === null || !saveSlots[slotIndex] || loadingSlot) return;
        setLoadingSlot(true);
        setSaveError(undefined);
        try {
            await loadCollectionSave(api, activeConsole, game.id, slotIndex);
        } catch (err) {
            console.warn('Load state failed:', err);
            setSaveError(err instanceof Error ? err.message : 'Could not load on MiSTer.');
        } finally {
            setLoadingSlot(false);
        }
    }, [saveSlots, game, activeConsole, api, loadingSlot]);

    /** Delete selected slot. Returns whether game has any beaten slot after deletion. */
    const handleDelete = useCallback((): boolean => {
        const slot = getSaveSlots(saveKey)[selectedSlot];
        if (!slot || slot.locked) return false;
        const updated = deleteSaveSlot(saveKey, selectedSlot);
        setSaveSlots(updated);
        setSaveError(undefined);
        void removeUnusedSaveScreenshot(api, slot).catch(err => {
            console.warn('Save screenshot cleanup failed:', err);
            setSaveError('The save slot was removed, but its screenshot could not be deleted.');
        });
        return hasCompletedVersion();
    }, [saveKey, selectedSlot, api, hasCompletedVersion]);

    /** Toggle beaten flag on selected slot. Returns whether game has any beaten slot after toggle. */
    const handleToggleBeaten = useCallback((): boolean => {
        if (!saveSlots[selectedSlot]) return false;
        const slot = saveSlots[selectedSlot]!;
        const updated = putSaveSlot(saveKey, selectedSlot, { ...slot, beaten: !slot.beaten });
        setSaveSlots(updated);
        return hasCompletedVersion();
    }, [saveKey, selectedSlot, saveSlots, hasCompletedVersion]);

    return {
        selectedSlot, setSelectedSlot, resetSelection,
        saveSlots, savingSlot, saveError, loadingSlot, hasRomMapping,
        handleSave, loadSlot, handleDelete, handleToggleLock, handleToggleBeaten,
    };
}
