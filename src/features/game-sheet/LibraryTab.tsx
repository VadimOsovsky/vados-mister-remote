import { useState } from 'react';
import type { ConsoleKey, GameOverrides, LaunchBoxGame } from '../../types';
import { BookIcon } from '../../lib/icons';
import { getImageUrl, resolveImages } from '../../services/launchbox';
import { getGameOverrides, setGameOverrides } from '../../lib/storage';
import './LibraryTab.css';

export function LibraryTab({ game, regions, activeConsole, onOpenGallery }: {
    game: LaunchBoxGame;
    regions: string[];
    activeConsole: ConsoleKey;
    onOpenGallery: (index: number) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [overrides, setOverrides] = useState<GameOverrides>(() => getGameOverrides(game.id, activeConsole));
    const [draft, setDraft] = useState<GameOverrides>(overrides);

    const images = resolveImages(game, regions);
    const frontSrc = overrides.boxFrontUrl || (images.front ? getImageUrl(images.front) : undefined);
    const backSrc = overrides.boxBackUrl || (images.back ? getImageUrl(images.back) : undefined);
    const cartridgeSrc = overrides.cartridgeUrl || undefined;
    const manualUrl = overrides.manualUrl || undefined;
    const manualPhotoSrc = overrides.manualPhotoUrl || undefined;

    const hasFront = !!frontSrc;
    const hasBack = !!backSrc;
    const frontGalleryIdx = 0;
    const backGalleryIdx = hasFront ? 1 : 0;
    const cartGalleryIdx = (hasFront ? 1 : 0) + (hasBack ? 1 : 0);

    function handleSave() {
        setGameOverrides(game.id, activeConsole, draft);
        setOverrides(draft);
        setEditing(false);
    }

    function handleCancel() {
        setDraft(overrides);
        setEditing(false);
    }

    if (editing) {
        return (
            <div className="sheet-panel">
                <div className="library-edit-form">
                    <label className="library-edit-field">
                        <span className="library-edit-label">Box Front URL</span>
                        <input
                            className="library-edit-input"
                            type="url"
                            placeholder="https://..."
                            value={draft.boxFrontUrl ?? ''}
                            onChange={e => setDraft({ ...draft, boxFrontUrl: e.target.value || undefined })}
                        />
                    </label>
                    <label className="library-edit-field">
                        <span className="library-edit-label">Box Back URL</span>
                        <input
                            className="library-edit-input"
                            type="url"
                            placeholder="https://..."
                            value={draft.boxBackUrl ?? ''}
                            onChange={e => setDraft({ ...draft, boxBackUrl: e.target.value || undefined })}
                        />
                    </label>
                    <label className="library-edit-field">
                        <span className="library-edit-label">Cartridge URL</span>
                        <input
                            className="library-edit-input"
                            type="url"
                            placeholder="https://..."
                            value={draft.cartridgeUrl ?? ''}
                            onChange={e => setDraft({ ...draft, cartridgeUrl: e.target.value || undefined })}
                        />
                    </label>
                    <label className="library-edit-field">
                        <span className="library-edit-label">Manual URL</span>
                        <input
                            className="library-edit-input"
                            type="url"
                            placeholder="https://..."
                            value={draft.manualUrl ?? ''}
                            onChange={e => setDraft({ ...draft, manualUrl: e.target.value || undefined })}
                        />
                    </label>
                    <label className="library-edit-field">
                        <span className="library-edit-label">Manual Photo URL</span>
                        <input
                            className="library-edit-input"
                            type="url"
                            placeholder="https://..."
                            value={draft.manualPhotoUrl ?? ''}
                            onChange={e => setDraft({ ...draft, manualPhotoUrl: e.target.value || undefined })}
                        />
                    </label>
                    <label className="library-edit-field">
                        <span className="library-edit-label">ROM Name (MiSTer)</span>
                        <input
                            className="library-edit-input"
                            type="text"
                            placeholder="Game.nes"
                            value={draft.romName ?? ''}
                            onChange={e => setDraft({ ...draft, romName: e.target.value || undefined })}
                        />
                    </label>
                    <div className="library-edit-actions">
                        <button className="sheet-btn sheet-btn-primary" onClick={handleSave}>Save</button>
                        <button className="sheet-btn sheet-btn-secondary" onClick={handleCancel}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

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
            <button
                className="sheet-btn sheet-btn-secondary"
                onClick={() => { setDraft(overrides); setEditing(true); }}
                style={{ marginTop: 8 }}
            >
                Edit
            </button>
        </div>
    );
}
