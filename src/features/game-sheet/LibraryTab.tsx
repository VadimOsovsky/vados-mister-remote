import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { BookIcon } from '../../lib/icons';
import { getImageUrl, resolveImages } from '../../services/launchbox';
import { getGameOverrides } from '../../lib/storage';
import './LibraryTab.css';

export function LibraryTab({ game, regions, activeConsole, onOpenGallery }: {
    game: LaunchBoxGame;
    regions: string[];
    activeConsole: ConsoleKey;
    onOpenGallery: (index: number) => void;
}) {
    const overrides = getGameOverrides(game.id, activeConsole);

    const images = resolveImages(game, regions);
    const frontSrc = overrides.boxFrontUrl || (images.front ? getImageUrl(images.front, 400) : undefined);
    const backSrc = overrides.boxBackUrl || (images.back ? getImageUrl(images.back, 400) : undefined);
    const cartridgeSrc = overrides.cartridgeUrl || undefined;
    const manualUrl = overrides.manualUrl || undefined;
    const manualPhotoSrc = overrides.manualPhotoUrl || undefined;

    const hasFront = !!frontSrc;
    const hasBack = !!backSrc;
    const frontGalleryIdx = 0;
    const backGalleryIdx = hasFront ? 1 : 0;
    const cartGalleryIdx = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);

    return (
        <div className="sheet-panel">
            <div className="library-covers">
                <div
                    className={`library-cover${frontSrc ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (frontSrc) onOpenGallery(frontGalleryIdx); }}
                >
                    <div className="library-cover-label">Front</div>
                    <div className="library-cover-frame">
                        {frontSrc
                            ? <img src={frontSrc} alt="Front cover" />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
                <div
                    className={`library-cover${backSrc ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (backSrc) onOpenGallery(backGalleryIdx); }}
                >
                    <div className="library-cover-label">Back</div>
                    <div className="library-cover-frame">
                        {backSrc
                            ? <img src={backSrc} alt="Back cover" />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
            </div>
            <div className="library-covers">
                <div
                    className={`library-cover${cartridgeSrc ? ' library-cover-clickable' : ''}`}
                    onClick={() => { if (cartridgeSrc) onOpenGallery(cartGalleryIdx); }}
                >
                    <div className="library-cover-label">Cartridge</div>
                    <div className="library-cover-frame">
                        {cartridgeSrc
                            ? <img src={cartridgeSrc} alt="Cartridge" />
                            : <div className="library-cover-empty">No image</div>}
                    </div>
                </div>
                {manualPhotoSrc ? (
                    <div className="library-cover library-cover-clickable"
                        onClick={() => onOpenGallery((hasFront ? 1 : 0) + (hasBack ? 1 : 0) + (cartridgeSrc ? 1 : 0))}
                    >
                        <div className="library-cover-label">Manual</div>
                        <div className="library-cover-frame">
                            <img src={manualPhotoSrc} alt="Manual" />
                        </div>
                    </div>
                ) : (
                    <div className="library-cover" />
                )}
            </div>
            {manualUrl && (
                <button
                    className="sheet-btn sheet-btn-secondary library-manual-btn"
                    onClick={() => window.open(manualUrl, '_blank')}
                >
                    {BookIcon}
                    <span>View Manual</span>
                </button>
            )}
            {overrides.romName && (
                <div className="library-rom-name">
                    ROM: {overrides.romName}
                </div>
            )}
        </div>
    );
}
