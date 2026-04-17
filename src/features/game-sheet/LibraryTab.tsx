import type { SSGame } from '../../types';
import { BookIcon } from '../../lib/icons';
import {
    resolveBackThumb,
    resolveCartridgeThumb,
    resolveFrontThumb,
    resolveManualUrl,
    resolveMediaUrl,
} from '../../services/screenscraper';
import './LibraryTab.css';

export function LibraryTab({ game, regions, onOpenGallery }: {
    game: SSGame;
    regions: string[];
    onOpenGallery: (index: number) => void;
}) {
    const front = resolveFrontThumb(game, regions);
    const back = resolveBackThumb(game, regions);
    const cartridge = resolveCartridgeThumb(game, regions);
    const manualUrl = resolveManualUrl(game, regions);

    const frontRotStyle = front?.rotation ? { transform: `rotate(${front.rotation}deg)` } : undefined;
    const backRotStyle = back?.rotation ? { transform: `rotate(${back.rotation}deg)` } : undefined;
    const cartRotStyle = cartridge?.rotation ? { transform: `rotate(${cartridge.rotation}deg)` } : undefined;

    const hasFront = !!resolveMediaUrl(game, regions, 'box-2D');
    const hasBack = !!resolveMediaUrl(game, regions, 'box-2D-back');
    const frontGalleryIdx = 0;
    const backGalleryIdx = hasFront ? 1 : 0;
    const cartGalleryIdx = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);

    return (
        <div className="sheet-panel">
            <div className="library-covers">
                <div
                    className={`library-cover${front ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (front) onOpenGallery(frontGalleryIdx); }}
                >
                    <div className="library-cover-label">Front</div>
                    <div className="library-cover-frame">
                        {front
                            ? <img src={front.src} alt="Front cover" style={frontRotStyle} />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
                <div
                    className={`library-cover${back ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (back) onOpenGallery(backGalleryIdx); }}
                >
                    <div className="library-cover-label">Back</div>
                    <div className="library-cover-frame">
                        {back
                            ? <img src={back.src} alt="Back cover" style={backRotStyle} />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
            </div>
            <div className="library-covers">
                <div
                    className={`library-cover${cartridge ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (cartridge) onOpenGallery(cartGalleryIdx); }}
                >
                    <div className="library-cover-label">Cartridge</div>
                    <div className="library-cover-frame">
                        {cartridge
                            ? <img src={cartridge.src} alt="Cartridge" style={cartRotStyle} />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
                <div className="library-cover" />
            </div>
            {manualUrl && (
                <button
                    className="sheet-btn sheet-btn-secondary library-manual-btn"
                    onClick={() => window.open(`https://docs.google.com/gview?url=${encodeURIComponent(manualUrl)}`, '_blank')}
                >
                    {BookIcon}
                    <span>View Manual</span>
                </button>
            )}
        </div>
    );
}
