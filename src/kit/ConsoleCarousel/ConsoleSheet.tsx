import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { BottomSheet } from '../BottomSheet';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { CONSOLE_GROUPS, PLATFORMS } from '../../constants';
import { consolePrice } from '../../lib/consolePricing';
import { formatPrice } from '../../lib/pricing';
import { ChevronDownIcon } from '../../lib/icons';
import { ConsoleControls } from './ConsoleControls';
import type { ConsoleKey } from '../../types';
import nesPhoto from '../../assets/consoles/nes.webp';
import famicomPhoto from '../../assets/consoles/famicom.webp';
import fdsPhoto from '../../assets/consoles/fds.webp';
import dendyPhoto from '../../assets/consoles/dendy.webp';
import avFamicomPhoto from '../../assets/consoles/av-famicom.webp';
import avFamicomFdsPhoto from '../../assets/consoles/av-famicom-fds.webp';
import './ConsoleSheet.css';

const consolePhotos: Partial<Record<ConsoleKey, string>> = {
    nes_ntsc: nesPhoto,
    nes_pal: nesPhoto,
    famicom: famicomPhoto,
    fds: fdsPhoto,
    dendy: dendyPhoto,
    av_famicom: avFamicomPhoto,
    av_famicom_fds: avFamicomFdsPhoto,
};

export function ConsoleBadge({ onClick, expanded }: { onClick: () => void; expanded: boolean }) {
    const platform = usePlatform();
    const activeConsole = useCollectionState(state => state.activeConsole);
    const photo = consolePhotos[activeConsole];

    return (
        <button className="console-badge playroom-press" onClick={onClick} aria-haspopup="dialog" aria-expanded={expanded} aria-label={platform.name} title={platform.name}>
            {photo && <img className="console-badge-photo" src={photo} alt="" />}
            <span className="console-badge-name">{platform.name}</span>
            <span className="console-badge-chevron" aria-hidden="true">{ChevronDownIcon}</span>
        </button>
    );
}

export function ConsoleSheet({ open, onOpenChange, onSwitch }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSwitch: (key: ConsoleKey) => void;
}) {
    const activeConsole = useCollectionState(state => state.activeConsole);
    const owned = useCollectionState(state => state.ownedConsoles);
    const balance = useCollectionState(state => state.balance);
    const free = useCollectionState(state => state.economyDisabled);
    const purchaseConsole = useCollectionState(state => state.purchaseConsole);
    const platform = PLATFORMS[activeConsole];
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [pending, setPending] = useState<ConsoleKey | null>(null);
    const [purchased, setPurchased] = useState(false);
    const [error, setError] = useState(false);
    const [seenOpen, setSeenOpen] = useState(open);
    const groupId = useId();
    const scroller = useRef<HTMLDivElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const origin = useRef<ConsoleKey | null>(null);
    const restoreFocus = useRef(false);
    const price = pending ? consolePrice(pending, owned) : null;

    if (seenOpen !== open) {
        setSeenOpen(open);
        if (open) {
            setExpandedGroup(null);
            setPending(null);
            setPurchased(false);
            setError(false);
        }
    }

    useLayoutEffect(() => {
        if (pending) {
            scroller.current?.scrollTo(0, 0);
            heading.current?.focus({ preventScroll: true });
        } else if (restoreFocus.current) {
            restoreFocus.current = false;
            scroller.current?.querySelector<HTMLButtonElement>(`[data-console="${origin.current}"]`)?.focus();
        }
    }, [pending, purchased]);

    function selectConsole(key: ConsoleKey) {
        if (key !== activeConsole) onSwitch(key);
        onOpenChange(false);
    }

    function confirmPurchase(key: ConsoleKey) {
        if (purchaseConsole(key)) setPurchased(true);
        else setError(true);
    }

    return (
        <BottomSheet open={open} onOpenChange={onOpenChange} overlayClassName="console-sheet-overlay" className="console-sheet">
            <Drawer.Handle className="console-sheet-handle" />
            <header className="console-sheet-header">
                {pending && !purchased && <button type="button" className="console-sheet-back" aria-label="Back to consoles"
                    onClick={() => { restoreFocus.current = true; setPending(null); setError(false); }}>
                    {ChevronDownIcon}
                </button>}
                <Drawer.Title ref={heading} tabIndex={-1} className="picker-title">
                    {purchased ? 'Console added!' : pending ? 'Buy console' : 'Consoles'}
                </Drawer.Title>
                <Drawer.Close className="console-sheet-close" aria-label="Close">×</Drawer.Close>
            </header>

            <div className="console-sheet-body" ref={scroller} data-vaul-no-drag>
                {pending ? (
                    <ConsoleCheckout key={pending} consoleKey={pending} price={price} balance={balance} free={free}
                        purchased={purchased} error={error} onBuy={() => confirmPurchase(pending)}
                        onSelect={() => selectConsole(pending)} />
                ) : (
                    <div className="console-picker">
                        <div className="picker-options picker-groups">
                            {CONSOLE_GROUPS.map(group => {
                                const isActive = group.consoles.includes(activeConsole);
                                const representative = isActive ? activeConsole : group.consoles.find(key => owned.includes(key));
                                const preview = representative ?? group.consoles[0];
                                const photo = preview ? consolePhotos[preview] : group.unavailable?.[0]?.photo;
                                const expanded = expandedGroup === group.id;
                                const name = representative ? PLATFORMS[representative].name : group.name;
                                const optionsId = `${groupId}-${group.id}`;
                                return (
                                    <button type="button" key={group.id} className="picker-option picker-group-trigger playroom-press"
                                            data-active={isActive} aria-expanded={expanded}
                                            aria-controls={optionsId} onClick={() => setExpandedGroup(expanded ? null : group.id)}>
                                        <ConsoleTile photo={photo} name={name} label={isActive ? 'Current console' : 'Browse models'} />
                                        <span className="picker-group-chevron" aria-hidden="true">{ChevronDownIcon}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {CONSOLE_GROUPS.map(group => {
                            const expanded = expandedGroup === group.id;
                            const ownedModels = group.consoles.filter(key => owned.includes(key));
                            const forSale = group.consoles.filter(key => !owned.includes(key));
                            return (
                                <section key={group.id} aria-label={`${group.name} models`} className="picker-disclosure"
                                    id={`${groupId}-${group.id}`} data-expanded={expanded} inert={!expanded}>
                                    <div className="picker-disclosure-inner">
                                        {ownedModels.length > 0 && <section className="picker-section">
                                            <h3>Owned</h3>
                                            <div className="picker-options">
                                                {ownedModels.map(key => <button type="button" key={key} className="picker-option playroom-press"
                                                    aria-current={key === activeConsole || undefined} onClick={() => selectConsole(key)}>
                                                    <ConsoleTile photo={consolePhotos[key]} name={PLATFORMS[key].name} label={key === activeConsole ? '✓ Selected' : 'Select'} />
                                                </button>)}
                                            </div>
                                        </section>}
                                        {forSale.length > 0 && <section className="picker-section">
                                            <div className="picker-section-header">
                                                <h3>Available to buy</h3>
                                                {!free && <p className="picker-balance">Your balance <strong>{formatPrice(balance)}</strong></p>}
                                            </div>
                                            <div className="picker-options">
                                                {forSale.map(key => <button type="button" key={key} className="picker-option playroom-press"
                                                    data-console={key} onClick={() => {
                                                        origin.current = key;
                                                        setPending(key);
                                                    }}>
                                                    <ConsoleTile photo={consolePhotos[key]} name={PLATFORMS[key].name}
                                                        label={free ? 'Add' : formatPrice(consolePrice(key, owned) ?? 0)} />
                                                </button>)}
                                            </div>
                                        </section>}
                                        {(group.unavailable?.length ?? 0) > 0 && <section className="picker-section">
                                            <h3>Unavailable</h3>
                                            <div className="picker-options">
                                                {group.unavailable?.map(model => <div key={model.id} className="picker-option picker-option-unavailable">
                                                    <ConsoleTile photo={model.photo} name={model.name} label="Unavailable" />
                                                </div>)}
                                            </div>
                                        </section>}
                                    </div>
                                </section>
                            );
                        })}
                        {!!platform.controls?.length && <section className="console-sheet-footer" aria-label={`${platform.name} controls`}>
                            <h3 className="console-sheet-actions-title">{platform.name} controls</h3>
                            <ConsoleControls activeConsole={activeConsole} />
                        </section>}
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}

function ConsoleTile({ photo, name, label }: { photo?: string; name: string; label: string }) {
    return <>
        <span className="picker-option-art">{photo && <img src={photo} alt="" />}</span>
        <strong>{name}</strong>
        <span className="picker-option-label">{label}</span>
    </>;
}

function ConsoleCheckout({ consoleKey, price, balance, free, purchased, error, onBuy, onSelect }: {
    consoleKey: ConsoleKey;
    price: number | null;
    balance: number;
    free: boolean;
    purchased: boolean;
    error: boolean;
    onBuy: () => void;
    onSelect: () => void;
}) {
    const platform = PLATFORMS[consoleKey];
    const photo = consolePhotos[consoleKey];
    const shortfall = price === null || free ? 0 : Math.max(0, price - balance);
    const owned = price === null;

    return (
        <div className="console-checkout">
            <div className="console-checkout-art">
                {photo && <img src={photo} alt="" />}
                {purchased && <span className="console-checkout-check" aria-hidden="true">✓</span>}
            </div>
            <div className="console-checkout-title">
                <h3>{platform.name}</h3>
                {platform.branding !== platform.name && <p>{platform.branding}</p>}
            </div>
            {purchased ? <p className="console-checkout-status" role="status">{platform.name} is now in your collection.</p> : null}
            {!free && price !== null && (
                <dl className="console-checkout-details">
                    <div><dt>Price</dt><dd>{formatPrice(price)}</dd></div>
                    <div><dt>Your balance</dt><dd>{formatPrice(balance)}</dd></div>
                    {shortfall === 0 && <div><dt>Balance after purchase</dt><dd>{formatPrice(balance - price)}</dd></div>}
                </dl>
            )}
            {shortfall > 0 && <p className="console-checkout-status" role="status">You need {formatPrice(shortfall)} more.</p>}
            {error && <p className="console-checkout-status" role="alert">Could not add this console. Try again.</p>}
            <button type="button" className="console-checkout-action playroom-button playroom-primary playroom-press"
                disabled={shortfall > 0} onClick={owned ? onSelect : onBuy}>
                <span>{owned ? `Play on ${platform.name}` : free ? 'Add console' : 'Buy console'}</span>
                {!free && price !== null && <strong>{formatPrice(price)}</strong>}
            </button>
        </div>
    );
}
