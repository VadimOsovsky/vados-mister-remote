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
        handleSave: () => void;
        handleLoad: () => void;
        handleDelete: () => void;
        handleToggleLock: () => void;
        handleToggleBeaten: () => boolean;
    };
}) {
    const { markAsBeaten, unmarkAsBeaten } = useAppContext();
    const { selectedSlot, setSelectedSlot, saveSlots, savingSlot, handleSave, handleLoad, handleDelete, handleToggleLock, handleToggleBeaten } = saveState;
    const currentSlot = selectedSlot !== null ? saveSlots[selectedSlot] : null;
    const isLocked = !!currentSlot?.locked;
    const isBeaten = !!currentSlot?.beaten;

    function onToggleBeaten() {
        const hasAnyBeaten = handleToggleBeaten();
        if (hasAnyBeaten) markAsBeaten(gameId);
        else unmarkAsBeaten(gameId);
    }

    return (
        <div className="sheet-panel">
            <div className="ctrl-grid">
                <button
                    className={`ctrl-btn${selectedSlot === null || !currentSlot || isLocked ? ' ctrl-btn-disabled' : ''}`}
                    onClick={handleDelete}
                    disabled={selectedSlot === null || !currentSlot || isLocked}
                >
                    {TrashIcon}
                    <span>Delete</span>
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
                    className={`ctrl-btn${selectedSlot === null || savingSlot || isLocked && !!currentSlot ? ' ctrl-btn-disabled' : ''}`}
                    onClick={handleSave}
                    disabled={selectedSlot === null || savingSlot || (isLocked && !!currentSlot)}
                >
                    {SaveIcon}
                    <span>{savingSlot ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                    className={`ctrl-btn${selectedSlot === null || !currentSlot ? ' ctrl-btn-disabled' : ''}${isBeaten ? ' ctrl-btn-beaten' : ''}`}
                    onClick={onToggleBeaten}
                    disabled={selectedSlot === null || !currentSlot}
                >
                    {TrophyIcon}
                    <span>Beaten</span>
                </button>
                <button
                    className={`ctrl-btn${selectedSlot === null || !saveSlots[selectedSlot ?? 0] ? ' ctrl-btn-disabled' : ''}`}
                    onClick={handleLoad}
                    disabled={selectedSlot === null || !saveSlots[selectedSlot ?? 0]}
                >
                    {LoadIcon}
                    <span>Load</span>
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
