import { useState } from 'react';
import { Drawer } from 'vaul';
import type { LaunchBoxGame } from '../../types';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { useMisterState } from '../../state/misterState';
import { useRomPicker } from '../../hooks/useRomPicker';
import { addRomTranslation, getOriginalRomMapping, getRomVersions, removeRomTranslation, selectRomVersion, setRomMapping } from '../../lib/storage';
import { TrashIcon } from '../../lib/icons';
import { BottomSheet } from '../../kit/BottomSheet';
import { RomPicker } from './RomPicker';
import './GameLanguages.css';

import { GAME_LANGUAGES } from '../../lib/gameLanguages';
const LanguageIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h12M9 3v2M5 5c0 6 5 10 8 11M13 5c0 6-5 10-9 12M14 21l4-10 4 10M15.5 17h5" /></svg>;

export function GameLanguages({ game, disabled, onChange }: { game: LaunchBoxGame; disabled: boolean; onChange: () => void }) {
    const api = useMisterState(state => state.api);
    const platform = usePlatform();
    const activeConsole = useCollectionState(state => state.activeConsole);
    const connected = useMisterState(state => state.connected);
    const versions = getRomVersions(game.id, activeConsole);
    const originalPath = getOriginalRomMapping(game.id, activeConsole);
    const selectedLanguage = versions.translations.find(v => v.path === versions.selected)?.language ?? 'Original';
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'translation' | 'original' | null>(null);
    const [language, setLanguage] = useState<string>(GAME_LANGUAGES[0]);
    const [error, setError] = useState('');
    const picker = useRomPicker(api, platform, game, activeConsole, undefined, open && mode !== null && connected);

    function changeOpen(value: boolean) {
        setOpen(value);
        if (!value) { picker.closeRomPicker(); setMode(null); setError(''); }
    }

    function chooseFile(nextMode: 'translation' | 'original') {
        setError('');
        setMode(nextMode);
        picker.openRomPicker(game.title);
    }

    return <>
        <button type="button" className="game-language-trigger" disabled={disabled} aria-label={`Game language: ${selectedLanguage}`}
            title={`Game language: ${selectedLanguage}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => changeOpen(true)}>
            {LanguageIcon}<span>{selectedLanguage}</span><svg className="game-language-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        <BottomSheet open={open} onOpenChange={changeOpen} className="game-language-sheet" overlayClassName="game-language-overlay">
            <Drawer.Handle className="game-language-handle" />
            <header className="game-language-header">
                <div><Drawer.Title>Game language</Drawer.Title><Drawer.Description>Choose a version. Each has its own save slots.</Drawer.Description></div>
                <Drawer.Close className="owned-button owned-icon" aria-label="Close languages">×</Drawer.Close>
            </header>
            <div className="game-language-body">
                <div className="game-language-versions" role="group" aria-label="Choose game version">
                    {[{ language: 'Original', path: originalPath, original: true }, ...versions.translations.map(v => ({ ...v, original: false }))].map(v => {
                        const selected = v.original ? versions.selected === null : versions.selected === v.path;
                        const translationPath = v.original ? null : v.path;
                        return <div className="game-language-version-row" key={v.original ? 'original' : v.path}>
                            <button type="button" className="game-language-version" aria-pressed={selected} disabled={disabled}
                                onClick={() => {
                                    try { selectRomVersion(game.id, activeConsole, v.original ? null : v.path); onChange(); }
                                    catch { setError('Could not save the language. Try again.'); }
                                }}>
                                <span className="game-language-check" aria-hidden="true">{selected ? '✓' : ''}</span>
                                <span className="game-language-version-info"><strong>{v.language}</strong><small>{v.path?.replace(/\\/g, '/').split('/').pop() || 'No game file linked'}</small></span>
                            </button>
                            {translationPath && <button type="button" className="game-language-remove"
                                aria-label={`Remove ${v.language} translation`} title={`Remove ${v.language} translation`} disabled={disabled}
                                onClick={() => {
                                    setError('');
                                    try { removeRomTranslation(game.id, activeConsole, translationPath); onChange(); }
                                    catch { setError('Could not remove the translation. Try again.'); }
                                }}>
                                {TrashIcon}
                            </button>}
                        </div>;
                    })}
                </div>
                {mode === null ? <div className="game-language-tools">
                    <button type="button" className="owned-button owned-gold playroom-press" disabled={disabled} onClick={() => chooseFile('translation')}>+ Add translation</button>
                    <button type="button" className="game-language-text-button" disabled={disabled} onClick={() => chooseFile('original')}>{originalPath ? 'Change original ROM' : 'Link original ROM'}</button>
                </div> : <section className="game-language-form" aria-label={mode === 'translation' ? 'Add a translation' : 'Link original ROM'}>
                    <div className="game-language-form-heading"><h3>{mode === 'translation' ? 'Add a translation' : 'Original game file'}</h3>
                        <button type="button" className="game-language-text-button" onClick={() => { setMode(null); setError(''); picker.closeRomPicker(); }}>Cancel</button>
                    </div>
                    {mode === 'translation' && <label className="game-language-label">Language
                        <select value={language} onChange={e => setLanguage(e.target.value)}>{GAME_LANGUAGES.map(value => <option key={value} value={value}>{value}</option>)}</select>
                    </label>}
                    <div className="game-language-rom">
                        <span className="game-language-field-title">{mode === 'translation' ? 'Translated game file' : 'Game file on MiSTer'}</span>
                        {connected ? <RomPicker {...picker} closeRomPicker={() => { picker.closeRomPicker(); setMode(null); }} selectRom={async result => {
                            try {
                                if (mode === 'translation') addRomTranslation(game.id, activeConsole, language, result.path);
                                else setRomMapping(game.id, activeConsole, result.path);
                                picker.closeRomPicker(); onChange();
                            } catch (err) { setError(err instanceof Error ? err.message : 'Could not link game file.'); }
                        }} /> : <div className="game-language-offline"><span className="game-language-offline-dot" aria-hidden="true" /><div><strong>MiSTer is disconnected</strong><p>Connect your MiSTer to search for a ROM.</p></div></div>}
                    </div>
                </section>}
                {error && <p className="game-language-error" role="alert">{error}</p>}
                <p className="game-language-footnote">Switching languages won’t launch the game. Your original ROM and saves stay available.</p>
            </div>
        </BottomSheet>
    </>;
}
