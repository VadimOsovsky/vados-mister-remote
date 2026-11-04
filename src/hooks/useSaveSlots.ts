import { useCallback, useState } from 'react';
import type { ConsoleKey, LaunchBoxGame, SaveSlot } from '../types';
import type { WizzoApi } from '../services/wizzoApi';
import { getSaveSlots, putSaveSlot, deleteSaveSlot, getRomMapping } from '../lib/storage';
import { loadCollectionSave } from '../services/collectionLauncher';

export function useSaveSlots(api: WizzoApi, game: LaunchBoxGame, activeConsole: ConsoleKey) {
    const [selectedSlot, setSelectedSlot] = useState(0);
    const [saveSlots, setSaveSlots] = useState(() => getSaveSlots(game.id));
    const [savingSlot, setSavingSlot] = useState(false);

    function resetSelection() {
        setSaveSlots(getSaveSlots(game.id));
        setSelectedSlot(0);
    }

    const handleToggleLock = useCallback(() => {
        if (!saveSlots[selectedSlot]) return;
        const slot = saveSlots[selectedSlot]!;
        const updated = putSaveSlot(game.id, selectedSlot, { ...slot, locked: !slot.locked });
        setSaveSlots(updated);
    }, [selectedSlot, saveSlots, game]);

    const handleSave = useCallback(async () => {
        if (savingSlot) return;
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
                    gameName: game.title,
                };
                const updated = putSaveSlot(game.id, selectedSlot, slot);
                setSaveSlots(updated);
            }
        } catch (err) {
            console.warn('Save state failed:', err);
        } finally {
            setSavingSlot(false);
        }
    }, [selectedSlot, game, savingSlot, api, saveSlots]);

    const [loadingSlot, setLoadingSlot] = useState(false);
    const hasRomMapping = Boolean(getRomMapping(game.id, activeConsole));

    const loadSlot = useCallback(async (slotIndex: number | null) => {
        if (slotIndex === null || !saveSlots[slotIndex] || loadingSlot) return;
        setLoadingSlot(true);
        try {
            await loadCollectionSave(api, activeConsole, game.id, slotIndex);
        } catch (err) {
            console.warn('Load state failed:', err);
        } finally {
            setLoadingSlot(false);
        }
    }, [saveSlots, game, activeConsole, api, loadingSlot]);

    /** Delete selected slot. Returns whether game has any beaten slot after deletion. */
    const handleDelete = useCallback((): boolean => {
        if (!saveSlots[selectedSlot]) return false;
        if (saveSlots[selectedSlot]?.locked) return false;
        const slot = saveSlots[selectedSlot]!;
        api.deleteScreenshot(slot.screenshotCore, slot.screenshotFilename).catch(() => {});
        const updated = deleteSaveSlot(game.id, selectedSlot);
        setSaveSlots(updated);
        return updated.some(s => s?.beaten);
    }, [selectedSlot, saveSlots, game, api]);

    /** Toggle beaten flag on selected slot. Returns whether game has any beaten slot after toggle. */
    const handleToggleBeaten = useCallback((): boolean => {
        if (!saveSlots[selectedSlot]) return false;
        const slot = saveSlots[selectedSlot]!;
        const updated = putSaveSlot(game.id, selectedSlot, { ...slot, beaten: !slot.beaten });
        setSaveSlots(updated);
        return updated.some(s => s?.beaten);
    }, [selectedSlot, saveSlots, game]);

    return {
        selectedSlot, setSelectedSlot, resetSelection,
        saveSlots, savingSlot, loadingSlot, hasRomMapping,
        handleSave, loadSlot, handleDelete, handleToggleLock, handleToggleBeaten,
    };
}
