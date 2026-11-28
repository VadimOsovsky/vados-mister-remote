import { useId, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { GameArtwork, GameOverrides } from '../../types';
import { GAME_LANGUAGES } from '../../lib/gameLanguages';
import { COVER_KEYS, getCoverSources, resolveGameArtwork, type CoverKey } from '../../lib/gameArtwork';
import { coverImageCrossOrigin, isUploadedCover, uploadCover } from '../../services/coverUploads';
import { LazyImage } from '../../kit/LazyImage';
import { ArtworkPlaceholder } from './ArtworkPlaceholder';
import './GameArtworkEditor.css';

export function GameArtworkEditor({ draft, defaultCovers, mediaLabel, initialLanguage = 'original', onChange, onWebManualChange, uploading, onUploadingChange }: {
    draft: GameOverrides;
    defaultCovers: Partial<Record<CoverKey, string>>;
    mediaLabel: string;
    initialLanguage?: string;
    onChange: (language: string, key: keyof GameArtwork, value: string) => void;
    onWebManualChange: (value: string) => void;
    uploading: boolean;
    onUploadingChange: (value: boolean) => void;
}) {
    const [language, setLanguage] = useState(initialLanguage);
    const [asset, setAsset] = useState('boxFrontUrl');
    const [uploadError, setUploadError] = useState('');
    const manualFile = useRef<HTMLInputElement>(null);
    const id = useId();
    const original = language === 'original';
    const own = original ? draft : draft.artworkByLanguage?.[language] ?? {};
    const resolved = resolveGameArtwork(draft, language);
    const assets = [
        { key: 'boxFrontUrl', label: 'Front cover', previewKey: COVER_KEYS.boxFrontUrl },
        { key: 'boxBackUrl', label: 'Back cover', previewKey: COVER_KEYS.boxBackUrl },
        { key: 'cartridgeUrl', label: mediaLabel },
        { key: 'manualPhotoUrl', label: 'Manual' },
    ] as const;
    const languages = [...new Set<string>([...GAME_LANGUAGES, ...Object.keys(draft.artworkByLanguage ?? {})])];
    const hasOwnImage = (item: (typeof assets)[number]) => Boolean(own[item.key]?.trim() ||
        ('previewKey' in item && own[item.previewKey]?.trim()) || (item.key === 'manualPhotoUrl' && own.manualUrl?.trim()));
    const filled = assets.filter(hasOwnImage).length;

    async function uploadCoverImage(file: File, key: keyof GameArtwork, version: 'preview' | 'full') {
        setUploadError('');
        onUploadingChange(true);
        try {
            onChange(language, key, await uploadCover(file, version));
        } catch (error) {
            setUploadError((error as Error).message);
        } finally {
            onUploadingChange(false);
        }
    }

    async function uploadManualImage(file: File) {
        setUploadError('');
        onUploadingChange(true);
        try {
            const bitmap = await createImageBitmap(file);
            try {
                // Keep the image small enough for the shared collection snapshot.
                const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                canvas.height = Math.max(1, Math.round(bitmap.height * scale));
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Image canvas unavailable');
                context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                onChange(language, 'manualPhotoUrl', canvas.toDataURL('image/webp', 0.85));
            } finally {
                bitmap.close();
            }
        } catch {
            setUploadError('Could not open this image. Try a JPEG, PNG, or WebP file.');
        } finally {
            onUploadingChange(false);
        }
    }

    return <section className="artwork-editor" aria-label="Game artwork">
        <div className="artwork-editor-heading"><strong>Photos &amp; manual</strong><small>{filled ? `${filled} linked` : original ? 'Optional' : 'Using originals'}</small></div>
        <label className="artwork-language-label" htmlFor={`${id}-language`}>Material language</label>
        <select id={`${id}-language`} className="edit-game-input artwork-language-select" value={language} disabled={uploading} onChange={e => { setLanguage(e.target.value); setUploadError(''); }}>
            <option value="original">Original</option>
            {languages.map(value => <option key={value} value={value}>{value}{Object.values(draft.artworkByLanguage?.[value] ?? {}).some(Boolean) ? ' · Added' : ''}</option>)}
        </select>
        <p className="artwork-editor-hint">{original ? 'Choose an item to add or change its image.' : 'Add only what differs. Empty fields use the original materials.'}</p>
        <Tabs.Root value={asset} onValueChange={value => { setAsset(value); setUploadError(''); }}>
            <Tabs.List className="artwork-tiles" aria-label="Choose material to edit">
                {assets.map((item, index) => {
                    const [src, ...fallbacks] = 'previewKey' in item
                        ? getCoverSources(draft, language, item.key, 'preview', [defaultCovers[item.key]])
                        : [resolved[item.key] ?? ''];
                    return <Tabs.Trigger key={item.key} value={item.key} className="artwork-tile" disabled={uploading}>
                        <span className="artwork-tile-top" aria-hidden="true"><span>0{index + 1}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 3v10M3 8h10" /></svg></span>
                        <span className="artwork-tile-image">{src ? <LazyImage src={src} fallbackSrcs={fallbacks} crossOrigin={coverImageCrossOrigin} alt="" /> : <ArtworkPlaceholder kind={item.key} disk={mediaLabel === 'Disk'} />}</span>
                        <strong>{item.label}</strong><small>{hasOwnImage(item) ? 'Linked' : src ? 'Original' : 'Add photo'}</small>
                    </Tabs.Trigger>;
                })}
            </Tabs.List>
            {assets.map(item => <Tabs.Content key={item.key} value={item.key} className="artwork-field-panel">
                {'previewKey' in item ? <div className="artwork-cover-fields">
                    <p className="artwork-editor-hint">If one version is missing, the other is used.</p>
                    <CoverImageField label="Preview image" value={own[item.previewKey] ?? ''} disabled={uploading}
                        onChange={value => onChange(language, item.previewKey, value)}
                        onUpload={file => void uploadCoverImage(file, item.previewKey, 'preview')} />
                    <CoverImageField label="Fullscreen image" value={own[item.key] ?? ''} disabled={uploading}
                        onChange={value => onChange(language, item.key, value)}
                        onUpload={file => void uploadCoverImage(file, item.key, 'full')} />
                    {uploading && <p role="status" className="artwork-editor-hint">Uploading to MiSTer…</p>}
                </div> : <ArtworkUrlField label={item.label + ' image URL'} clearLabel={'Clear ' + item.label + ' image'}
                    placeholder={original ? 'https://…' : 'Leave empty to use original'}
                    value={own[item.key] ?? ''} onChange={value => onChange(language, item.key, value)}
                    disabled={item.key === 'manualPhotoUrl' && uploading} />}
                {item.key === 'manualPhotoUrl' && <>
                    <input ref={manualFile} type="file" accept="image/*" hidden onChange={event => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = '';
                        if (file) void uploadManualImage(file);
                    }} />
                    <button type="button" className="sheet-btn sheet-btn-secondary artwork-manual-link"
                        disabled={uploading} onClick={() => manualFile.current?.click()}>
                        {uploading ? 'Opening image…' : 'Upload manual image'}
                    </button>
                    <ArtworkUrlField label="Manual document URL" clearLabel="Clear manual document"
                        placeholder="PDF or website (optional)" value={own.manualUrl ?? ''}
                        onChange={value => onChange(language, 'manualUrl', value)} manual />
                    <ArtworkUrlField label="Web manual URL" clearLabel="Clear web manual"
                        placeholder="https://…/nes/super-mario-bros/" value={draft.webManualUrl ?? ''}
                        onChange={onWebManualChange} manual
                        hint="One link for all languages. Use the manual’s permanent page URL." />
                </>}
                {uploadError && <p role="alert" className="artwork-editor-hint">{uploadError}</p>}
            </Tabs.Content>)}
        </Tabs.Root>
    </section>;
}

function CoverImageField({ label, value, disabled, onChange, onUpload }: {
    label: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
    onUpload: (file: File) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const uploaded = isUploadedCover(value);
    return <div className="artwork-cover-field">
        <ArtworkUrlField label={`${label} URL`} clearLabel={`Clear ${label.toLowerCase()}`} placeholder="https://…"
            value={value} onChange={onChange} disabled={disabled} />
        <input ref={input} type="file" accept="image/*" hidden onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) onUpload(file);
        }} />
        <button type="button" className="sheet-btn sheet-btn-secondary" aria-label={`Upload ${label.toLowerCase()} from device`}
            disabled={disabled} onClick={() => input.current?.click()}>{uploaded ? 'Replace from device' : 'Upload from device'}</button>
    </div>;
}

function ArtworkUrlField({ label, clearLabel, placeholder, value, onChange, manual, hint, disabled }: {
    label: string;
    clearLabel: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    manual?: boolean;
    hint?: string;
    disabled?: boolean;
}) {
    const id = useId();
    const uploaded = value.startsWith('data:image/') || isUploadedCover(value);

    return <div className={manual ? 'edit-game-field artwork-manual-link' : 'edit-game-field'}>
        <label className="edit-game-label" htmlFor={id}>{label}</label>
        <div className="artwork-url-row">
            <input id={id} className="edit-game-input" type="url" placeholder={isUploadedCover(value) ? 'Image saved on MiSTer' : uploaded ? 'Image uploaded from device' : placeholder}
                aria-describedby={hint ? id + '-hint' : undefined}
                disabled={disabled} value={uploaded ? '' : value} onChange={event => onChange(event.target.value)} />
            <button type="button" className="artwork-clear" aria-label={clearLabel}
                disabled={disabled || !value} onClick={() => onChange('')}>×</button>
        </div>
        {hint && <small id={id + '-hint'} className="artwork-editor-hint">{hint}</small>}
    </div>;
}
