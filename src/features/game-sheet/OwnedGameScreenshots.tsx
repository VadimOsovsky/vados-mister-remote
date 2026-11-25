import { useId, useState } from 'react';
import { LazyImage } from '../../kit/LazyImage';
import { PhotoViewer } from '../../kit/PhotoViewer';
import { ScreenshotIcon, TrashIcon } from '../../lib/icons';
import type { WizzoScreenshot } from '../../services/wizzoApi';
import './OwnedGameScreenshots.css';

export interface GameScreenshotGallery {
    images: WizzoScreenshot[];
    backdropPath?: string;
}

export function OwnedGameScreenshots({ gallery, getUrl, canCapture, canEdit, busy, capturing, deleting, error, onCapture, onBackdrop, onDelete }: {
    gallery: GameScreenshotGallery;
    getUrl: (image: WizzoScreenshot) => string;
    canCapture: boolean;
    canEdit: boolean;
    busy: boolean;
    capturing: boolean;
    deleting?: string;
    error?: string;
    onCapture: () => void;
    onBackdrop: (path?: string) => void;
    onDelete: (path: string) => Promise<void>;
}) {
    const [viewing, setViewing] = useState<string>();
    const galleryId = useId();
    const index = gallery.images.findIndex(image => image.path === viewing);

    return <>
        <div className="owned-panel-banner">
            <div>
                <h2>My screenshots</h2>
                <p>{canCapture ? 'Pick a screenshot to use as this game’s backdrop.' : 'Launch this game on MiSTer to capture a screenshot.'}</p>
            </div>
            <span className="owned-screenshots-icon" aria-hidden="true">{ScreenshotIcon}</span>
        </div>
        <div className="owned-screenshots-toolbar">
            <span role="status">{deleting ? 'Deleting screenshot…' : gallery.images.length === 0 ? 'No screenshots yet' : `${gallery.images.length} ${gallery.images.length === 1 ? 'screenshot' : 'screenshots'}`}</span>
            <button type="button" className="owned-button owned-gold playroom-press" disabled={!canCapture || busy} onClick={onCapture}>
                {ScreenshotIcon}{capturing ? 'Capturing…' : 'Take screenshot'}
            </button>
        </div>
        {error && <p className="owned-screenshots-error" role="alert">{error}</p>}
        <div className="owned-screenshots-grid">
            {gallery.images.map((image, position) => {
                const selected = gallery.backdropPath === image.path;
                const label = `Screenshot ${gallery.images.length - position}`;
                const confirmationId = `${galleryId}-${encodeURIComponent(image.path)}`;
                const isDeleting = deleting === image.path;
                return <div className="owned-screenshot" key={image.path}>
                    <button type="button" className="owned-screenshot-preview" aria-label={`View ${label.toLowerCase()}`} onClick={() => setViewing(image.path)}>
                        <LazyImage src={getUrl(image)} alt={label} />
                    </button>
                    <div className="owned-screenshot-actions">
                        <button type="button" className="owned-button playroom-press" disabled={!canEdit || isDeleting} aria-pressed={selected}
                            aria-label={`Use ${label.toLowerCase()} as backdrop`}
                            onClick={() => onBackdrop(selected ? undefined : image.path)}>
                            {selected ? 'Selected backdrop' : 'Use as backdrop'}
                        </button>
                        <button type="button" className="owned-button owned-icon playroom-press" disabled={!canEdit || busy}
                            aria-label={`Delete ${label.toLowerCase()}`} popoverTarget={confirmationId}>{TrashIcon}</button>
                    </div>
                    <div className="owned-screenshot-confirm" id={confirmationId} popover="auto" role="dialog"
                        aria-labelledby={`${confirmationId}-title`}>
                        <strong id={`${confirmationId}-title`}>Delete {label.toLowerCase()}?</strong>
                        <p>This permanently deletes the file from MiSTer.</p>
                        <div className="owned-screenshot-confirm-actions">
                            <button type="button" className="owned-button playroom-press" popoverTarget={confirmationId}
                                popoverTargetAction="hide">Cancel</button>
                            <button type="button" className="owned-button owned-danger playroom-press" disabled={!canEdit || busy}
                                onClick={event => {
                                    const popover = event.currentTarget.closest('[popover]');
                                    if (popover instanceof HTMLElement) popover.hidePopover();
                                    void onDelete(image.path);
                                }}>Delete screenshot</button>
                        </div>
                    </div>
                </div>;
            })}
        </div>
        <PhotoViewer index={index < 0 ? null : index} onClose={() => setViewing(undefined)}
            slides={gallery.images.map(image => ({ src: getUrl(image) }))} />
    </>;
}
