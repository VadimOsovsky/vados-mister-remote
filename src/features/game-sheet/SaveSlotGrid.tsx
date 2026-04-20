import type { SaveSlot } from '../../types';
import { LockIcon, TrophyBadgeIcon } from '../../lib/icons';
import './SaveSlotGrid.css';

export function SaveSlotGrid({ slots, selectedSlot, onSelectSlot, getScreenshotUrl }: {
    slots: (SaveSlot | null)[];
    selectedSlot: number | null;
    onSelectSlot: (index: number | null) => void;
    getScreenshotUrl: (core: string, filename: string) => string;
}) {
    return (
        <div className="slot-grid">
            {slots.map((slot, i) => (
                <button
                    key={i}
                    className={`slot-tile${selectedSlot === i ? (slot?.beaten ? ' slot-tile-beaten' : ' slot-tile-selected') : ''}${slot ? '' : ' slot-tile-empty'}`}
                    onClick={() => onSelectSlot(selectedSlot === i ? null : i)}
                >
                    {slot ? (
                        <img
                            src={getScreenshotUrl(slot.screenshotCore, slot.screenshotFilename)}
                            alt={`Slot ${i + 1}`}
                            className="slot-screenshot"
                        />
                    ) : (
                        <div className="slot-empty-label">Empty</div>
                    )}
                    {slot?.locked && <div className="slot-lock-badge">{LockIcon}</div>}
                    {slot?.beaten && <div className="slot-beaten-badge">{TrophyBadgeIcon}</div>}
                </button>
            ))}
        </div>
    );
}
