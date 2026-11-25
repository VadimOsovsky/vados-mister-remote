import { useState } from 'react';
import { LazyImage } from '../../kit/LazyImage';
import { PhotoViewer } from '../../kit/PhotoViewer';
import { ScreenshotIcon } from '../../lib/icons';
import type { WizzoScreenshot } from '../../services/wizzoApi';
import './OwnedGameScreenshots.css';

export interface GameScreenshotGallery {
    images: WizzoScreenshot[];
    backdropPath?: string;
}

export function OwnedGameScreenshots({ gallery, getUrl, canCapture, canEdit, busy, capturing, error, onCapture, onBackdrop }: {
    gallery: GameScreenshotGallery;
    getUrl: (image: WizzoScreenshot) => string;
    canCapture: boolean;
    canEdit: boolean;
    busy: boolean;
    capturing: boolean;
    error?: string;
    onCapture: () => void;
    onBackdrop: (path?: string) => void;
}) {
    const [viewing, setViewing] = useState<string>();
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
            <span role="status">{gallery.images.length === 0 ? 'No screenshots yet' : `${gallery.images.length} ${gallery.images.length === 1 ? 'screenshot' : 'screenshots'}`}</span>
            <button type="button" className="owned-button owned-gold playroom-press" disabled={!canCapture || busy} onClick={onCapture}>
                {ScreenshotIcon}{capturing ? 'Capturing…' : 'Take screenshot'}
            </button>
        </div>
        {error && <p className="owned-screenshots-error" role="alert">{error}</p>}
        <div className="owned-screenshots-grid">
            {gallery.images.map((image, position) => {
                const selected = gallery.backdropPath === image.path;
                const label = `Screenshot ${gallery.images.length - position}`;
                return <div className="owned-screenshot" key={image.path}>
                    <button type="button" className="owned-screenshot-preview" aria-label={`View ${label.toLowerCase()}`} onClick={() => setViewing(image.path)}>
                        <LazyImage src={getUrl(image)} alt={label} />
                    </button>
                    <button type="button" className="owned-button playroom-press" disabled={!canEdit} aria-pressed={selected}
                        aria-label={`Use ${label.toLowerCase()} as backdrop`}
                        onClick={() => onBackdrop(selected ? undefined : image.path)}>
                        {selected ? 'Selected backdrop' : 'Use as backdrop'}
                    </button>
                </div>;
            })}
        </div>
        <PhotoViewer index={index < 0 ? null : index} onClose={() => setViewing(undefined)}
            slides={gallery.images.map(image => ({ src: getUrl(image) }))} />
    </>;
}
