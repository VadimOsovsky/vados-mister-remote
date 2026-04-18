import type { SaveSlot } from '../../types';
import type { WizzoApi } from '../../services/wizzoApi';
import { KEYBOARD_KEYS } from '../../services/wizzoApi';
import { ResetIcon, TrashIcon, SaveIcon, LoadIcon } from '../../lib/icons';
import { SaveSlotGrid } from './SaveSlotGrid';
import './ControlsTab.css';

export function ControlsTab({ api, saveState }: {
    api: WizzoApi;
    saveState: {
        selectedSlot: number | null;
        setSelectedSlot: (slot: number | null) => void;
        saveSlots: (SaveSlot | null)[];
        savingSlot: boolean;
        handleSave: () => void;
        handleLoad: () => void;
        handleDelete: () => void;
    };
}) {
    const { selectedSlot, setSelectedSlot, saveSlots, savingSlot, handleSave, handleLoad, handleDelete } = saveState;

    return (
        <div className="sheet-panel">
            <div className="ctrl-grid">
                <button className="ctrl-btn" onClick={() => api.sendKey(KEYBOARD_KEYS.user)}>
                    {ResetIcon}
                    <span>Reset</span>
                </button>
                <button
                    className={`ctrl-btn${selectedSlot === null || !saveSlots[selectedSlot ?? 0] ? ' ctrl-btn-disabled' : ''}`}
                    onClick={handleDelete}
                    disabled={selectedSlot === null || !saveSlots[selectedSlot ?? 0]}
                >
                    {TrashIcon}
                    <span>Delete</span>
                </button>
                <button
                    className={`ctrl-btn${selectedSlot === null || savingSlot ? ' ctrl-btn-disabled' : ''}`}
                    onClick={handleSave}
                    disabled={selectedSlot === null || savingSlot}
                >
                    {SaveIcon}
                    <span>{savingSlot ? 'Saving...' : 'Save'}</span>
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
