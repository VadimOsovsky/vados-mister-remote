import { useId, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { GameArtwork, GameOverrides } from '../../types';
import { GAME_LANGUAGES } from '../../lib/gameLanguages';
import { ARTWORK_KEYS, resolveGameArtwork } from '../../lib/gameArtwork';
import { LazyImage } from '../../kit/LazyImage';
import { ArtworkPlaceholder } from './ArtworkPlaceholder';
import './GameArtworkEditor.css';

export function GameArtworkEditor({ draft, mediaLabel, initialLanguage = 'original', onChange, onWebManualChange, uploading, onUploadingChange }: {
    draft: GameOverrides;
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
        { key: 'boxFrontUrl', label: 'Front cover' },
        { key: 'boxBackUrl', label: 'Back cover' },
        { key: 'cartridgeUrl', label: mediaLabel },
        { key: 'manualPhotoUrl', label: 'Manual' },
    ] as const;
    const languages = [...new Set<string>([...GAME_LANGUAGES, ...Object.keys(draft.artworkByLanguage ?? {})])];
    const filled = ARTWORK_KEYS.filter(key => own[key]?.trim()).length;

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
        <select id={`${id}-language`} className="edit-game-input artwork-language-select" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="original">Original</option>
            {languages.map(value => <option key={value} value={value}>{value}{Object.values(draft.artworkByLanguage?.[value] ?? {}).some(Boolean) ? ' · Added' : ''}</option>)}
        </select>
        <p className="artwork-editor-hint">{original ? 'Choose an item to add or change its image.' : 'Add only what differs. Empty fields use the original materials.'}</p>
        <Tabs.Root value={asset} onValueChange={setAsset}>
            <Tabs.List className="artwork-tiles" aria-label="Choose material to edit">
                {assets.map((item, index) => <Tabs.Trigger key={item.key} value={item.key} className="artwork-tile">
                    <span className="artwork-tile-top" aria-hidden="true"><span>0{index + 1}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 3v10M3 8h10" /></svg></span>
                    <span className="artwork-tile-image">{resolved[item.key] ? <LazyImage src={resolved[item.key]} alt="" /> : <ArtworkPlaceholder kind={item.key} disk={mediaLabel === 'Disk'} />}</span>
                    <strong>{item.label}</strong><small>{own[item.key] ? 'Linked' : resolved[item.key] ? 'Original' : 'Add photo'}</small>
                </Tabs.Trigger>)}
            </Tabs.List>
            {assets.map(item => <Tabs.Content key={item.key} value={item.key} className="artwork-field-panel">
                <ArtworkUrlField label={item.label + ' image URL'} clearLabel={'Clear ' + item.label + ' image'}
                    placeholder={original ? 'https://…' : 'Leave empty to use original'}
                    value={own[item.key] ?? ''} onChange={value => onChange(language, item.key, value)}
                    disabled={item.key === 'manualPhotoUrl' && uploading} />
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
                    {uploadError && <p role="alert" className="artwork-editor-hint">{uploadError}</p>}
                    <ArtworkUrlField label="Manual document URL" clearLabel="Clear manual document"
                        placeholder="PDF or website (optional)" value={own.manualUrl ?? ''}
                        onChange={value => onChange(language, 'manualUrl', value)} manual />
                    <ArtworkUrlField label="Web manual URL" clearLabel="Clear web manual"
                        placeholder="https://…/nes/super-mario-bros/" value={draft.webManualUrl ?? ''}
                        onChange={onWebManualChange} manual
                        hint="One link for all languages. Use the manual’s permanent page URL." />
                </>}
            </Tabs.Content>)}
        </Tabs.Root>
    </section>;
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
    const uploaded = value.startsWith('data:image/');

    return <div className={manual ? 'edit-game-field artwork-manual-link' : 'edit-game-field'}>
        <label className="edit-game-label" htmlFor={id}>{label}</label>
        <div className="artwork-url-row">
            <input id={id} className="edit-game-input" type="url" placeholder={uploaded ? 'Image uploaded from device' : placeholder}
                aria-describedby={hint ? id + '-hint' : undefined}
                disabled={disabled} value={uploaded ? '' : value} onChange={event => onChange(event.target.value)} />
            <button type="button" className="artwork-clear" aria-label={clearLabel}
                disabled={disabled || !value} onClick={() => onChange('')}>×</button>
        </div>
        {hint && <small id={id + '-hint'} className="artwork-editor-hint">{hint}</small>}
    </div>;
}
