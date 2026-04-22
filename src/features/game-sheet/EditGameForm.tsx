import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsoleKey, GameOverrides, LaunchBoxGame } from '../../types';
import type { WizzoGameSearchResult } from '../../services/wizzoApi';
import { useAppContext } from '../../AppContext';
import { TrashIcon } from '../../lib/icons';
import { getGameOverrides, setGameOverrides, getRomMapping, setRomMapping } from '../../lib/storage';
import { getImageUrl, resolveImages, resolveTitle } from '../../services/launchbox';
import { PLATFORMS } from '../../constants';
import './EditGameForm.css';

export function EditGameForm({ game, regions, activeConsole, onSave, onCancel, onDelete, isNew }: {
    game: LaunchBoxGame;
    regions: string[];
    activeConsole: ConsoleKey;
    onSave: () => void;
    onCancel: () => void;
    onDelete: () => void;
    isNew?: boolean;
}) {
    const [draft, setDraft] = useState<GameOverrides>(() => {
        if (isNew) return getGameOverrides(game.id, activeConsole);
        const overrides = getGameOverrides(game.id, activeConsole);
        const images = resolveImages(game, regions);
        return {
            title: overrides.title || resolveTitle(game, PLATFORMS[activeConsole].nameRegions),
            boxFrontUrl: overrides.boxFrontUrl || (images.front ? getImageUrl(images.front) : undefined),
            boxBackUrl: overrides.boxBackUrl || (images.back ? getImageUrl(images.back) : undefined),
            cartridgeUrl: overrides.cartridgeUrl,
            manualPhotoUrl: overrides.manualPhotoUrl,
            manualUrl: overrides.manualUrl,
            romName: overrides.romName || getRomMapping(game.id, activeConsole)?.split('/').pop() || undefined,
        };
    });
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── ROM autocomplete state ──
    const { api, platform } = useAppContext();
    const [romResults, setRomResults] = useState<WizzoGameSearchResult[]>([]);
    const [romLoading, setRomLoading] = useState(false);
    const [romDropdownOpen, setRomDropdownOpen] = useState(false);
    const romDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    const romFieldRef = useRef<HTMLDivElement>(null);
    const [romHighlight, setRomHighlight] = useState(-1);

    const searchRoms = useCallback(async (query: string) => {
        if (!query.trim()) { setRomResults([]); return; }
        setRomLoading(true);
        try {
            const resp = await api.searchGames(query, platform.wizzoSystemId);
            setRomResults(resp.data ?? []);
        } catch {
            setRomResults([]);
        } finally {
            setRomLoading(false);
        }
    }, [api, platform.wizzoSystemId]);

    function handleRomInputChange(value: string) {
        set('romName', value);
        setRomHighlight(-1);
        if (romDebounceRef.current) clearTimeout(romDebounceRef.current);
        if (!value.trim()) {
            setRomResults([]);
            setRomDropdownOpen(false);
            return;
        }
        setRomDropdownOpen(true);
        romDebounceRef.current = setTimeout(() => searchRoms(value), 400);
    }

    function handleRomSelect(result: WizzoGameSearchResult) {
        const filename = result.path.split('/').pop() ?? result.name;
        setDraft(prev => ({ ...prev, romName: filename }));
        setRomMapping(game.id, activeConsole, result.path);
        setRomDropdownOpen(false);
        setRomResults([]);
    }

    function handleRomKeyDown(e: React.KeyboardEvent) {
        if (!romDropdownOpen || !romResults.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setRomHighlight(i => (i + 1) % romResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setRomHighlight(i => (i <= 0 ? romResults.length - 1 : i - 1));
        } else if (e.key === 'Enter' && romHighlight >= 0) {
            e.preventDefault();
            handleRomSelect(romResults[romHighlight]);
        } else if (e.key === 'Escape') {
            setRomDropdownOpen(false);
        }
    }

    // Close dropdown on outside click
    useEffect(() => {
        function onPointerDown(e: PointerEvent) {
            if (romFieldRef.current && !romFieldRef.current.contains(e.target as Node)) {
                setRomDropdownOpen(false);
            }
        }
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    function set(key: keyof GameOverrides, value: string) {
        setDraft(prev => ({ ...prev, [key]: value || undefined }));
    }

    const titleMissing = isNew && !draft.title?.trim();

    function handleSave() {
        if (titleMissing) return;
        if (isNew) {
            const cleaned: GameOverrides = {};
            for (const [k, v] of Object.entries(draft) as [keyof GameOverrides, string | undefined][]) {
                if (v) cleaned[k] = v;
            }
            setGameOverrides(game.id, activeConsole, cleaned);
            onSave();
            return;
        }
        // Only save fields that differ from defaults to avoid redundant storage
        const images = resolveImages(game, regions);
        const defaults: GameOverrides = {
            title: resolveTitle(game, PLATFORMS[activeConsole].nameRegions),
            boxFrontUrl: images.front ? getImageUrl(images.front) : undefined,
            boxBackUrl: images.back ? getImageUrl(images.back) : undefined,
            romName: getRomMapping(game.id, activeConsole)?.split('/').pop() || undefined,
        };
        const cleaned: GameOverrides = {};
        for (const [k, v] of Object.entries(draft) as [keyof GameOverrides, string | undefined][]) {
            if (v && v !== defaults[k]) cleaned[k] = v;
        }
        setGameOverrides(game.id, activeConsole, cleaned);
        onSave();
    }

    function handleDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        onDelete();
    }

    return (
        <div className="edit-game-form">
            <div className="edit-game-section">
                <div className="edit-game-section-title">Game Info</div>
                <label className="edit-game-field">
                    <span className="edit-game-label">Title</span>
                    <input
                        className="edit-game-input edit-game-input-title"
                        type="text"
                        placeholder="Game title"
                        value={draft.title ?? ''}
                        onChange={e => set('title', e.target.value)}
                    />
                </label>
                <div className="edit-game-field rom-autocomplete" ref={romFieldRef}>
                    <span className="edit-game-label">ROM (MiSTer)</span>
                    <div className="rom-autocomplete-anchor">
                        <input
                            className="edit-game-input"
                            type="text"
                            placeholder="Search ROMs on MiSTer..."
                            autoComplete="off"
                            value={draft.romName ?? ''}
                            onChange={e => handleRomInputChange(e.target.value)}
                            onFocus={() => { if (romResults.length) setRomDropdownOpen(true); }}
                            onKeyDown={handleRomKeyDown}
                        />
                        {romLoading && <span className="rom-autocomplete-spinner" />}
                        {romDropdownOpen && romResults.length > 0 && (
                            <ul className="rom-autocomplete-dropdown">
                                {romResults.map((r, i) => (
                                    <li
                                        key={r.path}
                                        className={`rom-autocomplete-item${i === romHighlight ? ' rom-autocomplete-item-active' : ''}`}
                                        onPointerDown={() => handleRomSelect(r)}
                                    >
                                        <span className="rom-autocomplete-name">{r.name}</span>
                                        <span className="rom-autocomplete-path">{r.path}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="edit-game-section">
                <div className="edit-game-section-title">Images</div>
                <label className="edit-game-field">
                    <span className="edit-game-label">Box Front URL</span>
                    <input
                        className="edit-game-input"
                        type="url"
                        placeholder="https://..."
                        value={draft.boxFrontUrl ?? ''}
                        onChange={e => set('boxFrontUrl', e.target.value)}
                    />
                </label>
                <label className="edit-game-field">
                    <span className="edit-game-label">Box Back URL</span>
                    <input
                        className="edit-game-input"
                        type="url"
                        placeholder="https://..."
                        value={draft.boxBackUrl ?? ''}
                        onChange={e => set('boxBackUrl', e.target.value)}
                    />
                </label>
                <label className="edit-game-field">
                    <span className="edit-game-label">Cartridge URL</span>
                    <input
                        className="edit-game-input"
                        type="url"
                        placeholder="https://..."
                        value={draft.cartridgeUrl ?? ''}
                        onChange={e => set('cartridgeUrl', e.target.value)}
                    />
                </label>
                <label className="edit-game-field">
                    <span className="edit-game-label">Manual Photo URL</span>
                    <input
                        className="edit-game-input"
                        type="url"
                        placeholder="https://..."
                        value={draft.manualPhotoUrl ?? ''}
                        onChange={e => set('manualPhotoUrl', e.target.value)}
                    />
                </label>
                <label className="edit-game-field">
                    <span className="edit-game-label">Manual URL</span>
                    <input
                        className="edit-game-input"
                        type="url"
                        placeholder="https://..."
                        value={draft.manualUrl ?? ''}
                        onChange={e => set('manualUrl', e.target.value)}
                    />
                </label>
            </div>

            <div className="edit-game-actions">
                <button className="sheet-btn sheet-btn-primary" onClick={handleSave} disabled={titleMissing}>Save</button>
                <button className="sheet-btn sheet-btn-secondary" onClick={onCancel}>Cancel</button>
            </div>

            {!isNew && (
                <div className="edit-game-danger">
                    <button
                        className={`edit-game-delete-btn${confirmDelete ? ' edit-game-delete-btn-confirm' : ''}`}
                        onClick={handleDelete}
                        onBlur={() => setConfirmDelete(false)}
                    >
                        {TrashIcon}
                        <span>{confirmDelete ? 'Confirm Delete' : 'Delete from Collection'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
