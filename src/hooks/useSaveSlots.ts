import { useCallback, useEffect, useState } from 'react';
import type { ConsoleKey, SaveSlot, SSGame } from '../types';
import { KEYBOARD_KEYS, type WizzoApi } from '../services/wizzoApi';
import { EMPTY_SLOTS, getSaveSlots, putSaveSlot } from '../lib/storage';

export function useSaveSlots(api: WizzoApi, selectedGame: SSGame | null, activeConsole: ConsoleKey, sheetTab: string) {
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [saveSlots, setSaveSlots] = useState<(SaveSlot | null)[]>(EMPTY_SLOTS);
    const [savingSlot, setSavingSlot] = useState(false);

    useEffect(() => {
        if (sheetTab === 'controls' && selectedGame) {
            setSaveSlots(getSaveSlots(selectedGame.id, activeConsole));
            setSelectedSlot(null);
        }
    }, [sheetTab, selectedGame, activeConsole]);

    const handleSave = useCallback(async () => {
        if (selectedSlot === null || !selectedGame || savingSlot) return;
        setSavingSlot(true);
        try {
            await api.sendKey(KEYBOARD_KEYS.saveState);
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
                    gameName: selectedGame.name,
                };
                const updated = putSaveSlot(selectedGame.id, activeConsole, selectedSlot, slot);
                setSaveSlots(updated);
            }
        } catch (err) {
            console.warn('Save state failed:', err);
        } finally {
            setSavingSlot(false);
        }
    }, [selectedSlot, selectedGame, savingSlot, api, activeConsole]);

    const handleLoad = useCallback(async () => {
        if (selectedSlot === null || !saveSlots[selectedSlot]) return;
        try {
            await api.sendKey(KEYBOARD_KEYS.loadState);
        } catch (err) {
            console.warn('Load state failed:', err);
        }
    }, [selectedSlot, saveSlots, api]);

    return {
        selectedSlot, setSelectedSlot,
        saveSlots, savingSlot,
        handleSave, handleLoad,
    };
}
