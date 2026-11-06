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
                <label className="edit-game-field"><span className="edit-game-label">{item.label} image URL</span>
                    <div className="artwork-url-row"><input className="edit-game-input" type="url" aria-label={`${item.label} image URL`} placeholder={original ? 'https://…' : 'Leave empty to use original'} value={own[item.key] ?? ''} onChange={e => onChange(language, item.key, e.target.value)} />
                        <button type="button" className="artwork-clear" aria-label={`Clear ${item.label} image`} disabled={!own[item.key]} onClick={() => onChange(language, item.key, '')}>×</button>
                    </div>
                </label>
                {item.key === 'manualPhotoUrl' && <label className="edit-game-field artwork-manual-link"><span className="edit-game-label">Manual document URL</span>
                    <div className="artwork-url-row"><input className="edit-game-input" type="url" aria-label="Manual document URL" placeholder="PDF or website (optional)" value={own.manualUrl ?? ''} onChange={e => onChange(language, 'manualUrl', e.target.value)} />
                        <button type="button" className="artwork-clear" aria-label="Clear manual document" disabled={!own.manualUrl} onClick={() => onChange(language, 'manualUrl', '')}>×</button>
                    </div>
                </label>}
                {item.key === 'manualPhotoUrl' && <label className="edit-game-field artwork-manual-link"><span className="edit-game-label">Web manual URL</span>
                    <div className="artwork-url-row"><input className="edit-game-input" type="url" aria-label="Web manual URL" placeholder="https://…/nes/super-mario-bros/" value={draft.webManualUrl ?? ''} onChange={e => onWebManualChange(e.target.value)} />
                        <button type="button" className="artwork-clear" aria-label="Clear web manual" disabled={!draft.webManualUrl} onClick={() => onWebManualChange('')}>×</button>
                    </div>
                    <small className="artwork-editor-hint">One link for all languages. Use the manual’s permanent page URL.</small>
                </label>}
            </Tabs.Content>)}
        </Tabs.Root>
    </section>;
}
