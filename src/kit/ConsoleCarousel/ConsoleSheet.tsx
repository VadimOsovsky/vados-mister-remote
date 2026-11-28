import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { useLocation, useNavigate } from 'react-router';
import { BottomSheet } from '../BottomSheet';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { useMisterWritable } from '../../state/misterState';
import { CONSOLE_GROUPS, PLATFORMS, STARTER_CONSOLE } from '../../constants';
import { CONSOLE_PRICE, CONSOLE_RESALE_PRICE, consolePrice } from '../../lib/consolePricing';
import { formatPrice } from '../../lib/pricing';
import { ChevronDownIcon } from '../../lib/icons';
import { confirmSharedStorageWrites } from '../../lib/sharedStorage';
import { GameCouponTicket } from '../../features/store/GameCouponTicket';
import { ConsoleControls } from './ConsoleControls';
import type { ConsoleKey } from '../../types';
import nesPhoto from '../../assets/consoles/nes.webp';
import famicomPhoto from '../../assets/consoles/famicom.webp';
import fdsPhoto from '../../assets/consoles/fds.webp';
import dendyPhoto from '../../assets/consoles/dendy.webp';
import avFamicomPhoto from '../../assets/consoles/av-famicom.webp';
import avFamicomFdsPhoto from '../../assets/consoles/av-famicom-fds.webp';
import snesUsPhoto from '../../assets/consoles/snes-us.webp';
import snesPalPhoto from '../../assets/consoles/snes-pal.webp';
import superFamicomPhoto from '../../assets/consoles/super-famicom.webp';
import n64Photo from '../../assets/consoles/n64.webp';
import './ConsoleSheet.css';

const consolePhotos: Partial<Record<ConsoleKey, string>> = {
    nes_ntsc: nesPhoto,
    nes_pal: nesPhoto,
    famicom: famicomPhoto,
    fds: fdsPhoto,
    dendy: dendyPhoto,
    av_famicom: avFamicomPhoto,
    av_famicom_fds: avFamicomFdsPhoto,
    snes_us: snesUsPhoto,
    snes_pal: snesPalPhoto,
    super_famicom: superFamicomPhoto,
    n64: n64Photo,
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
    const coupons = useCollectionState(state => state.gameCoupons);
    const purchaseConsole = useCollectionState(state => state.purchaseConsole);
    const sellConsole = useCollectionState(state => state.sellConsole);
    const writable = useMisterWritable();
    const navigate = useNavigate();
    const { search } = useLocation();
    const platform = PLATFORMS[activeConsole];
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [pending, setPending] = useState<ConsoleKey | null>(null);
    const [purchased, setPurchased] = useState(false);
    const [couponAwarded, setCouponAwarded] = useState(false);
    const [buying, setBuying] = useState(false);
    const [selling, setSelling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seenOpen, setSeenOpen] = useState(open);
    const groupId = useId();
    const scroller = useRef<HTMLDivElement>(null);
    const heading = useRef<HTMLHeadingElement>(null);
    const origin = useRef<ConsoleKey | null>(null);
    const restoreFocus = useRef(false);
    const price = pending ? consolePrice(pending, owned) : null;
    const sale = pending && selling && owned.includes(pending) && !free ? CONSOLE_RESALE_PRICE : null;

    if (seenOpen !== open) {
        setSeenOpen(open);
        if (open) {
            setExpandedGroup(null);
            setPending(null);
            setPurchased(false);
            setCouponAwarded(false);
            setSelling(false);
            setError(null);
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

    async function confirmPurchase(key: ConsoleKey) {
        if (buying) return;
        const earnsCoupon = !free && !coupons[key];
        setError(null);
        if (!purchaseConsole(key)) {
            setError('Could not add this console. Check your balance and try again.');
            return;
        }
        setBuying(true);
        const saved = await confirmSharedStorageWrites();
        setBuying(false);
        if (saved) {
            setCouponAwarded(earnsCoupon);
            setPurchased(true);
        } else setError('Purchase could not be confirmed. Check your console collection after syncing.');
    }

    return (
        <BottomSheet open={open} onOpenChange={onOpenChange} dismissible={!buying} overlayClassName="console-sheet-overlay" className="console-sheet">
            <Drawer.Handle className="console-sheet-handle" />
            <header className="console-sheet-header">
                {pending && !purchased && <button type="button" className="console-sheet-back" aria-label="Back to consoles" disabled={buying}
                    onClick={() => { restoreFocus.current = true; setPending(null); setError(null); }}>
                    {ChevronDownIcon}
                </button>}
                <Drawer.Title ref={heading} tabIndex={-1} className="picker-title">
                    {purchased ? 'Console added!' : selling && pending ? 'Sell console' : pending ? 'Buy console' : 'Consoles'}
                </Drawer.Title>
                <Drawer.Close className="console-sheet-close" aria-label="Close" disabled={buying}>×</Drawer.Close>
            </header>

            <div className="console-sheet-body" ref={scroller} data-vaul-no-drag>
                {pending && selling ? (
                    <div className="console-checkout">
                        <div className="console-checkout-art">
                            {consolePhotos[pending] && <img src={consolePhotos[pending]} alt="" />}
                        </div>
                        <div className="console-checkout-title"><h3>{PLATFORMS[pending].name}</h3></div>
                        <p className="console-checkout-status">
                            Its games will be available again if you buy this console back.
                            {pending === activeConsole && ` You'll switch to ${PLATFORMS[STARTER_CONSOLE].name}.`}
                        </p>
                        {sale !== null && <dl className="console-checkout-details">
                            <div><dt>Sale payout</dt><dd>{formatPrice(sale)}</dd></div>
                            <div><dt>Balance after sale</dt><dd>{formatPrice(Math.round((balance + sale) * 100) / 100)}</dd></div>
                        </dl>}
                        {!writable && <p className="console-checkout-status" role="status">Connect MiSTer to sell.</p>}
                        {(sale === null || error) && <p className="console-checkout-status" role="alert">Could not sell this console. Go back and try again.</p>}
                        <button type="button" className="console-checkout-action playroom-button playroom-primary playroom-press"
                            disabled={!writable || sale === null} onClick={() => {
                                if (sale !== null && sellConsole(pending, sale)) {
                                    if (pending === activeConsole) onSwitch(STARTER_CONSOLE);
                                    onOpenChange(false);
                                } else setError('Could not sell this console.');
                            }}>
                            Sell console{sale !== null && <strong>{formatPrice(sale)}</strong>}
                        </button>
                    </div>
                ) : pending ? (
                    <ConsoleCheckout key={pending} consoleKey={pending} price={price} balance={balance} free={free}
                        purchased={purchased} buying={buying} error={error} onBuy={() => void confirmPurchase(pending)}
                        offersCoupon={!free && !coupons[pending]} couponAwarded={couponAwarded}
                        onSelect={() => selectConsole(pending)} onBrowse={() => {
                            selectConsole(pending);
                            navigate('/store' + search);
                        }} />
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
                                                {ownedModels.map(key => <div key={key} className="picker-owned-model">
                                                    <button type="button" className="picker-option playroom-press"
                                                        aria-current={key === activeConsole || undefined} onClick={() => selectConsole(key)}>
                                                        <ConsoleTile photo={consolePhotos[key]} name={PLATFORMS[key].name} label={key === activeConsole ? '✓ Selected' : 'Select'} />
                                                    </button>
                                                    {!free && key !== STARTER_CONSOLE && <button type="button" className="picker-sell playroom-press"
                                                        aria-label={`Sell ${PLATFORMS[key].name} for ${formatPrice(CONSOLE_RESALE_PRICE)}`}
                                                        data-console={key} onClick={() => {
                                                            origin.current = key;
                                                            setSelling(true);
                                                            setPending(key);
                                                        }}>
                                                        Sell · {formatPrice(CONSOLE_RESALE_PRICE)}
                                                    </button>}
                                                </div>)}
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
                                                        setSelling(false);
                                                        setPending(key);
                                                    }}>
                                                    <ConsoleTile photo={consolePhotos[key]} name={PLATFORMS[key].name}
                                                        label={free ? 'Add' : formatPrice(CONSOLE_PRICE)} />
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

function ConsoleCheckout({ consoleKey, price, balance, free, purchased, buying, error, offersCoupon, couponAwarded, onBuy, onSelect, onBrowse }: {
    consoleKey: ConsoleKey;
    price: number | null;
    balance: number;
    free: boolean;
    purchased: boolean;
    buying: boolean;
    error: string | null;
    offersCoupon: boolean;
    couponAwarded: boolean;
    onBuy: () => void;
    onSelect: () => void;
    onBrowse: () => void;
}) {
    const writable = useMisterWritable();
    const platform = PLATFORMS[consoleKey];
    const photo = consolePhotos[consoleKey];
    const shortfall = price === null || free ? 0 : Math.max(0, price - balance);

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
            {purchased && <p className="console-checkout-status" role="status">{platform.name} is now in your collection.</p>}
            {!free && price !== null && (
                <dl className="console-checkout-details">
                    <div><dt>Price</dt><dd>{formatPrice(price)}</dd></div>
                    <div><dt>Your balance</dt><dd>{formatPrice(balance)}</dd></div>
                    {shortfall === 0 && <div><dt>Balance after purchase</dt><dd>{formatPrice(balance - price)}</dd></div>}
                </dl>
            )}
            {couponAwarded && <GameCouponTicket title="Free game coupon added">Use it on any game in the store.</GameCouponTicket>}
            {!purchased && !buying && price !== null && offersCoupon &&
                <GameCouponTicket title="Includes a free game coupon">Pick any game in the store, now or later.</GameCouponTicket>}
            {shortfall > 0 && <p className="console-checkout-status" role="status">You need {formatPrice(shortfall)} more.</p>}
            {error && <p className="console-checkout-status" role="alert">{error}</p>}
            {couponAwarded && <button type="button" className="console-checkout-action playroom-button playroom-primary playroom-press" onClick={onBrowse}>
                Choose a free game
            </button>}
            {purchased ? <button type="button" className={`console-checkout-action playroom-button playroom-press${couponAwarded ? '' : ' playroom-primary'}`} onClick={onSelect}>
                {couponAwarded ? 'Switch console' : `Play on ${platform.name}`}
            </button> : <button type="button" className="console-checkout-action playroom-button playroom-primary playroom-press"
                disabled={buying || price === null || !writable || shortfall > 0} onClick={onBuy}>
                <span>{buying ? 'Saving purchase…' : !writable ? 'Connect MiSTer to buy' : free ? 'Add console' : 'Buy console'}</span>
                {!free && price !== null && <strong>{formatPrice(price)}</strong>}
            </button>}
        </div>
    );
}
