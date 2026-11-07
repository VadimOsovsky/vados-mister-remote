import { useId, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { GameArtwork, GameOverrides } from '../../types';
import { GAME_LANGUAGES } from '../../lib/gameLanguages';
import { ARTWORK_KEYS, resolveGameArtwork } from '../../lib/gameArtwork';
import { LazyImage } from '../../kit/LazyImage';
import { ArtworkPlaceholder } from './ArtworkPlaceholder';
import './GameArtworkEditor.css';

export function GameArtworkEditor({ draft, mediaLabel, initialLanguage = 'original', onChange, onWebManualChange }: {
    draft: GameOverrides;
    mediaLabel: string;
    initialLanguage?: string;
    onChange: (language: string, key: keyof GameArtwork, value: string) => void;
    onWebManualChange: (value: string) => void;
}) {
    const [language, setLanguage] = useState(initialLanguage);
    const [asset, setAsset] = useState('boxFrontUrl');
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
                    value={own[item.key] ?? ''} onChange={value => onChange(language, item.key, value)} />
                {item.key === 'manualPhotoUrl' && <>
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

function ArtworkUrlField({ label, clearLabel, placeholder, value, onChange, manual, hint }: {
    label: string;
    clearLabel: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    manual?: boolean;
    hint?: string;
}) {
    const id = useId();

    return <div className={manual ? 'edit-game-field artwork-manual-link' : 'edit-game-field'}>
        <label className="edit-game-label" htmlFor={id}>{label}</label>
        <div className="artwork-url-row">
            <input id={id} className="edit-game-input" type="url" placeholder={placeholder}
                aria-describedby={hint ? id + '-hint' : undefined}
                value={value} onChange={event => onChange(event.target.value)} />
            <button type="button" className="artwork-clear" aria-label={clearLabel}
                disabled={!value} onClick={() => onChange('')}>×</button>
        </div>
        {hint && <small id={id + '-hint'} className="artwork-editor-hint">{hint}</small>}
    </div>;
}
