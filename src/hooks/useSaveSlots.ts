import { useCallback, useEffect, useState } from 'react';
import type { LaunchBoxGame, SaveSlot } from '../types';
import type { WizzoApi } from '../services/wizzoApi';
import { EMPTY_SLOTS, getSaveSlots, putSaveSlot, deleteSaveSlot } from '../lib/storage';

export function useSaveSlots(api: WizzoApi, selectedGame: LaunchBoxGame | null, sheetTab: string) {
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

    const handleLoad = useCallback(async () => {
        if (selectedSlot === null || !saveSlots[selectedSlot]) return;
        try {
            await api.loadState(selectedSlot!);
        } catch (err) {
            console.warn('Load state failed:', err);
        }
    }, [selectedSlot, saveSlots, api]);

    const handleDelete = useCallback(() => {
        if (selectedSlot === null || !saveSlots[selectedSlot] || !selectedGame) return;
        if (saveSlots[selectedSlot]?.locked) return;
        const slot = saveSlots[selectedSlot]!;
        api.deleteScreenshot(slot.screenshotCore, slot.screenshotFilename).catch(() => {});
        const updated = deleteSaveSlot(selectedGame.id, selectedSlot);
        setSaveSlots(updated);
    }, [selectedSlot, saveSlots, selectedGame, api]);

    return {
        selectedSlot, setSelectedSlot,
        saveSlots, savingSlot,
        handleSave, handleLoad, handleDelete, handleToggleLock,
    };
}
