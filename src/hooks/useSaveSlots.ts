import { useCallback, useEffect, useState } from 'react';
import type { ConsoleKey, LaunchBoxGame, SaveSlot } from '../types';
import type { WizzoApi } from '../services/wizzoApi';
import { EMPTY_SLOTS, getSaveSlots, putSaveSlot, deleteSaveSlot, getRomMapping } from '../lib/storage';
import { PLATFORMS } from '../constants';
import { launchGameForPlatform } from '../services/zaparooLauncher';

export function useSaveSlots(api: WizzoApi, selectedGame: LaunchBoxGame | null, sheetTab: string, activeConsole: ConsoleKey) {
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [saveSlots, setSaveSlots] = useState<(SaveSlot | null)[]>(EMPTY_SLOTS);
    const [savingSlot, setSavingSlot] = useState(false);

    useEffect(() => {
        if (sheetTab === 'controls' && selectedGame) {
            setSaveSlots(getSaveSlots(selectedGame.id));
            setSelectedSlot(null);
        }
    }, [sheetTab, selectedGame]);

    const handleToggleLock = useCallback(() => {
        if (selectedSlot === null || !saveSlots[selectedSlot] || !selectedGame) return;
        const slot = saveSlots[selectedSlot]!;
        const updated = putSaveSlot(selectedGame.id, selectedSlot, { ...slot, locked: !slot.locked });
        setSaveSlots(updated);
    }, [selectedSlot, saveSlots, selectedGame]);

    const handleSave = useCallback(async () => {
        if (selectedSlot === null || !selectedGame || savingSlot) return;
        if (saveSlots[selectedSlot]?.locked) return;
        setSavingSlot(true);
        try {
            // Delete old screenshot if overwriting a slot
            const oldSlot = saveSlots[selectedSlot];
            if (oldSlot) {
                api.deleteScreenshot(oldSlot.screenshotCore, oldSlot.screenshotFilename).catch(() => {});
            }

            await api.saveState(selectedSlot);
            await new Promise(r => setTimeout(r, 500));
            await api.takeScreenshot();
            await new Promise(r => setTimeout(r, 1000));
            const screenshots = await api.listScreenshots();
            if (screenshots.length > 0) {
                const latest = screenshots.sort(
                    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
                )[0];
                const slot: SaveSlot = {
                    slotIndex: selectedSlot,
                    screenshotCore: latest.core,
                    screenshotFilename: latest.filename,
                    savedAt: new Date().toISOString(),
                    gameName: selectedGame.title,
                };
                const updated = putSaveSlot(selectedGame.id, selectedSlot, slot);
                setSaveSlots(updated);
            }
        } catch (err) {
            console.warn('Save state failed:', err);
        } finally {
            setSavingSlot(false);
        }
    }, [selectedSlot, selectedGame, savingSlot, api, saveSlots]);

    const [loadingSlot, setLoadingSlot] = useState(false);
    const hasRomMapping = !!(selectedGame && getRomMapping(selectedGame.id, activeConsole));

    const handleLoad = useCallback(async () => {
        if (selectedSlot === null || !saveSlots[selectedSlot] || !selectedGame) return;
        setLoadingSlot(true);
        try {
            // Check if a game is already running
            const playing = await api.getPlaying();
            if (!playing.core) {
                // No core running — try to launch the game first
                const romPath = getRomMapping(selectedGame.id, activeConsole);
                if (!romPath) {
                    console.warn('No ROM mapping found, cannot auto-launch');
                    return;
                }
                const platform = PLATFORMS[activeConsole];
                await launchGameForPlatform(api.host, platform, romPath, api);
                // Poll until core is running (max ~15s)
                for (let i = 0; i < 30; i++) {
                    await new Promise(r => setTimeout(r, 500));
                    const status = await api.getPlaying();
                    if (status.core) break;
                }
            }
            await api.loadState(selectedSlot);
        } catch (err) {
            console.warn('Load state failed:', err);
        } finally {
            setLoadingSlot(false);
        }
    }, [selectedSlot, saveSlots, selectedGame, activeConsole, api]);

    const handleDelete = useCallback(() => {
        if (selectedSlot === null || !saveSlots[selectedSlot] || !selectedGame) return;
        if (saveSlots[selectedSlot]?.locked) return;
        const slot = saveSlots[selectedSlot]!;
        api.deleteScreenshot(slot.screenshotCore, slot.screenshotFilename).catch(() => {});
        const updated = deleteSaveSlot(selectedGame.id, selectedSlot);
        setSaveSlots(updated);
    }, [selectedSlot, saveSlots, selectedGame, api]);

    /** Toggle beaten flag on selected slot. Returns whether game has any beaten slot after toggle. */
    const handleToggleBeaten = useCallback((): boolean => {
        if (selectedSlot === null || !saveSlots[selectedSlot] || !selectedGame) return false;
        const slot = saveSlots[selectedSlot]!;
        const updated = putSaveSlot(selectedGame.id, selectedSlot, { ...slot, beaten: !slot.beaten });
        setSaveSlots(updated);
        return updated.some(s => s?.beaten);
    }, [selectedSlot, saveSlots, selectedGame]);

    return {
        selectedSlot, setSelectedSlot,
        saveSlots, savingSlot, loadingSlot, hasRomMapping,
        handleSave, handleLoad, handleDelete, handleToggleLock, handleToggleBeaten,
    };
}
