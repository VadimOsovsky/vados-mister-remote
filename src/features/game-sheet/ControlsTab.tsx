import { useState, useEffect } from 'react';
import type { SaveSlot } from '../../types';
import type { WizzoApi } from '../../services/wizzoApi';
import { useAppContext } from '../../AppContext';
import { LockIcon, UnlockIcon, TrashIcon, SaveIcon, LoadIcon, TrophyIcon } from '../../lib/icons';
import { SaveSlotGrid } from './SaveSlotGrid';
import './ControlsTab.css';

export function ControlsTab({ api, saveState, gameId }: {
    api: WizzoApi;
    gameId: string;
    saveState: {
        selectedSlot: number | null;
        setSelectedSlot: (slot: number | null) => void;
        saveSlots: (SaveSlot | null)[];
        savingSlot: boolean;
        loadingSlot: boolean;
        hasRomMapping: boolean;
        handleSave: () => void;
        handleLoad: () => void;
        handleDelete: () => boolean;
        handleToggleLock: () => void;
        handleToggleBeaten: () => boolean;
    };
}) {
    const { markAsBeaten, unmarkAsBeaten } = useAppContext();
    const { selectedSlot, setSelectedSlot, saveSlots, savingSlot, loadingSlot, hasRomMapping, handleSave, handleLoad, handleDelete, handleToggleLock, handleToggleBeaten } = saveState;
    const currentSlot = selectedSlot !== null ? saveSlots[selectedSlot] : null;
    const isLocked = !!currentSlot?.locked;
    const isBeaten = !!currentSlot?.beaten;
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => { setConfirmDelete(false); }, [selectedSlot]);

    function onToggleBeaten() {
        const hasAnyBeaten = handleToggleBeaten();
        if (hasAnyBeaten) markAsBeaten(gameId);
        else unmarkAsBeaten(gameId);
    }

    function onDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        setConfirmDelete(false);
        const hasAnyBeaten = handleDelete();
        if (!hasAnyBeaten) unmarkAsBeaten(gameId);
    }

    return (
        <div className="sheet-panel">
            <div className="ctrl-grid-top">
                <button
                    className={`ctrl-btn${selectedSlot === null || !currentSlot || isLocked ? ' ctrl-btn-disabled' : ''}${confirmDelete ? ' ctrl-btn-danger' : ''}`}
                    onClick={onDelete}
                    onBlur={() => setConfirmDelete(false)}
                    disabled={selectedSlot === null || !currentSlot || isLocked}
                >
                    {TrashIcon}
                    <span>{confirmDelete ? 'Confirm' : 'Delete'}</span>
                </button>
                <button
                    className={`ctrl-btn${selectedSlot === null || !currentSlot ? ' ctrl-btn-disabled' : ''}${isLocked ? ' ctrl-btn-active' : ''}`}
                    onClick={handleToggleLock}
                    disabled={selectedSlot === null || !currentSlot}
                >
                    {isLocked ? LockIcon : UnlockIcon}
                    <span>{isLocked ? 'Unlock' : 'Lock'}</span>
                </button>
                <button
                    className={`ctrl-btn${selectedSlot === null || !currentSlot ? ' ctrl-btn-disabled' : ''}${isBeaten ? ' ctrl-btn-beaten' : ''}`}
                    onClick={onToggleBeaten}
                    disabled={selectedSlot === null || !currentSlot}
                >
                    {TrophyIcon}
                    <span>Beaten</span>
                </button>
            </div>
            <div className="ctrl-grid-bottom">
                <button
                    className={`ctrl-btn ctrl-btn-wide${selectedSlot === null || savingSlot || isLocked && !!currentSlot ? ' ctrl-btn-disabled' : ''}`}
                    onClick={handleSave}
                    disabled={selectedSlot === null || savingSlot || (isLocked && !!currentSlot)}
                >
                    {SaveIcon}
                    <span>{savingSlot ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                    className={`ctrl-btn ctrl-btn-wide${selectedSlot === null || !saveSlots[selectedSlot ?? 0] || loadingSlot || !hasRomMapping ? ' ctrl-btn-disabled' : ''}`}
                    onClick={handleLoad}
                    disabled={selectedSlot === null || !saveSlots[selectedSlot ?? 0] || loadingSlot || !hasRomMapping}
                >
                    {LoadIcon}
                    <span>{loadingSlot ? 'Loading...' : 'Load'}</span>
                </button>
            </div>

            <SaveSlotGrid
                slots={saveSlots}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                getScreenshotUrl={(core, filename) => api.getScreenshotUrl(core, filename)}
            />
        </div>
    );
}
