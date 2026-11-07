import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useCollectionState } from '../../state/collectionState';
import { useMisterState, useIsGamePlaying } from '../../state/misterState';
import type { LaunchBoxGame } from '../../types';
import type { useSaveSlots } from '../../hooks/useSaveSlots';
import { LockIcon, UnlockIcon, SaveIcon, TrashIcon } from '../../lib/icons';
import { GameScreenshots } from '../../kit/GameScreenshots';
import { ExpandableDescription } from '../../kit/ExpandableDescription';
import { LazyImage } from '../../kit/LazyImage';

import { slotLabel } from './slotLabel';

export function OwnedGameAbout({ game, screenshots }: { game: LaunchBoxGame; screenshots: string[] }) {
    const facts = [
        ['Released', game.year],
        ['Developer', game.developer],
        ['Publisher', game.publisher],
        ['Genre', game.genre],
        ['Players', game.maxPlayers],
    ];

    return <>
        <p className="owned-eyebrow">A place on your shelf</p>
        <h2>About the game</h2>
        <GameScreenshots screenshots={screenshots} />
        <ExpandableDescription text={game.desc} />
        <dl className="owned-facts">
            {facts.map(([label, value]) => value ? <div key={label}><dt>{label}</dt><dd>{value}</dd></div> : null)}
        </dl>
    </>;
}

export function OwnedGameSaves({ gameId, title, saves, previewScreenshot }: { gameId: string; title: string; saves: ReturnType<typeof useSaveSlots>; previewScreenshot?: string }) {
    const api = useMisterState(state => state.api);
    const connected = useMisterState(state => state.connected);
    const activeConsole = useCollectionState(state => state.activeConsole);
    const markAsBeaten = useCollectionState(state => state.markAsBeaten);
    const unmarkAsBeaten = useCollectionState(state => state.unmarkAsBeaten);
    const playing = useIsGamePlaying(gameId, activeConsole);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { selectedSlot: index, setSelectedSlot, saveSlots } = saves;
    const current = saveSlots[index];
    const used = saveSlots.filter(Boolean).length;

    return <>
        <p className="owned-eyebrow">Right where you left off</p>
        <div className="owned-section-heading"><h2>Your save slots</h2><small>{used} of 4 used</small></div>
        <div className="owned-save-grid">
            {saveSlots.map((slot, i) => <button key={i} className={`owned-save-card ${slot ? 'owned-button' : 'owned-save-empty'}`}
                aria-pressed={i === index} onClick={() => setSelectedSlot(i)}>
                <span className="owned-save-art">
                    {slot ? <LazyImage src={slot.screenshotCore && slot.screenshotFilename
                        ? api.getScreenshotUrl(slot.screenshotCore, slot.screenshotFilename) : undefined}
                        fallbackSrc={previewScreenshot} alt="" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg>}
                </span>
                {slot?.beaten && <span className="owned-medal" aria-hidden="true">✓</span>}
                <span className="owned-save-caption">
                    <span>{slotLabel(i)}{slot?.locked && <span aria-label="Protected">{LockIcon}</span>}</span>
                    <small>{slot && <i className={slot.beaten ? 'completed' : ''} />}{slot ? slot.beaten ? 'Completed' : 'Saved' : 'Empty'}</small>
                </span>
            </button>)}
        </div>
        <section className="owned-save-selection" aria-label="Selected save slot">
            <strong>{slotLabel(index)}</strong>
            <div className="owned-save-actions">
                {current ? <>
                    <button className="owned-button playroom-press" aria-pressed={!!current.beaten} onClick={() => {
                        if (saves.handleToggleBeaten()) markAsBeaten(gameId, title);
                        else unmarkAsBeaten(gameId);
                    }}>✓ {current.beaten ? 'Completed' : 'Mark completed'}</button>
                    <button className="owned-button owned-icon playroom-press" aria-label={current.locked ? 'Unprotect save' : 'Protect save'}
                        aria-pressed={!!current.locked} onClick={saves.handleToggleLock}>{current.locked ? LockIcon : UnlockIcon}</button>
                </> : <p>Save your next adventure here. Start playing, then choose “Save to this slot”.</p>}
            </div>
        </section>
        <div className="owned-save-tools">
            <button className="owned-button playroom-press" disabled={!connected || !playing || !!current?.locked || saves.savingSlot || saves.loadingSlot}
                onClick={() => saves.handleSave()}>{SaveIcon}{saves.savingSlot ? 'Saving…' : 'Save to this slot'}</button>
            <button className="owned-button playroom-press" disabled={!current || current.locked} onClick={() => setConfirmDelete(true)}>{TrashIcon} Delete save</button>
        </div>
        {saves.saveError && <p role="alert">{saves.saveError}</p>}
        <Dialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
            <Dialog.Portal>
                <Dialog.Overlay className="owned-dialog-overlay" />
                <Dialog.Content className="owned-dialog owned-confirm">
                    <Dialog.Title>Delete {slotLabel(index)}?</Dialog.Title>
                    <Dialog.Description>This removes the save from your shelf.</Dialog.Description>
                    <div className="owned-save-tools">
                        <Dialog.Close className="owned-button playroom-press">Cancel</Dialog.Close>
                        <button className="owned-button owned-danger playroom-press" onClick={() => {
                            if (!saves.handleDelete()) unmarkAsBeaten(gameId);
                            setConfirmDelete(false);
                        }}>{TrashIcon} Delete save</button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    </>;
}
