import './StoreRomDialog.css';
import { useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { BottomSheet } from '../../kit/BottomSheet';
import type { useRomPicker } from '../../hooks/useRomPicker';
import type { WizzoGameSearchResult } from '../../services/wizzoApi';
import { FileIcon, SearchIcon, StoreIcon } from '../../lib/icons';
import { useCollectionState, usePlatform } from '../../state/collectionState';
import { formatGamePrice, formatPrice } from '../../lib/pricing';
import { GameCouponIcon } from './GameCouponTicket';

type Picker = ReturnType<typeof useRomPicker>;

type PaymentOptions = {
    balance: number;
    couponSelected: boolean;
    couponAvailable: boolean;
    onSelect: (useCoupon: boolean) => void;
};

type RomDialogProps = {
    picker: Picker;
    title: string;
    consoleName: string;
    preview: boolean;
    payment?: PaymentOptions;
    saving?: boolean;
    checkoutError?: string;
} & ({ price: number; canPurchase: boolean; launchLabel?: never } | { launchLabel: string; price?: never; canPurchase?: never });

export function StoreRomDialog(props: RomDialogProps) {
    const { picker, saving } = props;
    return (
        <BottomSheet open={picker.romPickerOpen} dismissible={!saving} onOpenChange={open => { if (!open) picker.closeRomPicker(); }}
            overlayClassName="owned-dialog-overlay" className="store-rom-dialog">
            <header>
                <div><p className="store-kicker">One last thing</p><Drawer.Title>Choose a game file</Drawer.Title></div>
                <Drawer.Close className="playroom-button playroom-icon-button playroom-press" aria-label="Close" disabled={saving}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </Drawer.Close>
            </header>
            {picker.romPickerOpen && <StoreRomForm {...props} />}
        </BottomSheet>
    );
}

function StoreRomForm({ picker, title, consoleName, price, preview, canPurchase, launchLabel, payment, saving, checkoutError }: RomDialogProps) {
    const economyDisabled = useCollectionState(state => state.economyDisabled);
    const platform = usePlatform();
    const searchRef = useRef<HTMLInputElement>(null);
    const [selected, setSelected] = useState<string>();
    const extension = platform.lbPlatform === 'fds' ? 'fds' : 'nes';
    const regions = ['USA', 'Europe', 'Japan'];
    const results = preview ? Array.from({ length: 12 }, (_, index) => {
        const region = regions[index % regions.length];
        const revision = index === 1 ? 1 : Math.floor(index / regions.length) + Number(region === 'Europe');
        const name = title + ' (' + region + ')' + (revision ? ' (Rev ' + revision + ')' : '') + '.' + extension;
        const directory = '/media/fat/games/' + consoleName + '/' + (region === 'Japan' ? 'Japan/' : '');
        return { name, path: directory + name, system: { id: consoleName, name: consoleName } };
    }).filter(file => file.name.toLowerCase().includes(picker.romSearchQuery.toLowerCase())) : picker.romSearchResults;
    const file = results.find(result => result.path === selected);
    const loading = !preview && picker.romSearchLoading;
    const error = !preview && picker.romSearchError;
    const redeeming = payment?.couponSelected;

    function updateQuery(query: string) {
        setSelected(undefined);
        picker.setRomSearchQuery(query);
    }

    function confirm(result: WizzoGameSearchResult) {
        if (preview && !launchLabel) picker.closeRomPicker();
        else void picker.selectRom(result);
    }

    return (
        <>
            <div className="store-rom-content" data-vaul-no-drag>
                <div className="store-rom-game">
                    <span className="store-rom-mark">{StoreIcon}</span>
                    <span><strong>{title}</strong><small>{consoleName} · Files on your MiSTer</small></span>
                </div>
                {payment && price !== undefined && <fieldset className="store-payment" disabled={saving}>
                    <legend>Payment method</legend>
                    <label>
                        <input type="radio" name="store-payment" checked={redeeming} disabled={!payment.couponAvailable} onChange={() => payment.onSelect(true)} />
                        <span>Free game coupon{!payment.couponAvailable && <small>Coupon no longer available</small>}</span>
                        <GameCouponIcon />
                    </label>
                    <label>
                        <input type="radio" name="store-payment" checked={!redeeming} disabled={payment.balance < price} onChange={() => payment.onSelect(false)} />
                        <span>Wallet<small>{payment.balance < price ? 'Not enough funds' : `${formatPrice(payment.balance)} available`}</small></span>
                        <strong>{formatPrice(price)}</strong>
                    </label>
                </fieldset>}
                <p>Pick the ROM you want to link to this game.</p>
                <div className="store-rom-search">
                    {SearchIcon}
                    <input ref={searchRef} type="search" aria-label="Search files on MiSTer" placeholder="Search files on MiSTer…"
                        value={picker.romSearchQuery} onChange={event => updateQuery(event.target.value)} />
                    {picker.romSearchQuery && (
                        <button type="button" className="store-rom-clear" aria-label="Clear search" onClick={() => {
                            updateQuery('');
                            searchRef.current?.focus();
                        }}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                        </button>
                    )}
                </div>
                <div className="store-rom-count" aria-live="polite">
                    <span>{loading ? error || 'Searching…' : `${results.length} ${results.length === 1 ? 'file' : 'files'} found`}</span>
                    <span>Name &amp; location</span>
                </div>
                <div className="store-rom-results" role="group" aria-label="Available game files">
                    {!loading && !results.length && <p role="status">{error || 'No matching files.'}</p>}
                    {results.map(result => (
                        <label className="store-rom-file" key={result.path}>
                            <span className="store-rom-file-icon" aria-hidden="true">{FileIcon}</span>
                            <span><strong>{result.name}</strong><small>{result.path.slice(0, result.path.lastIndexOf('/') + 1)}</small></span>
                            <input type="radio" name="store-rom" checked={file?.path === result.path}
                                onChange={() => setSelected(result.path)} />
                        </label>
                    ))}
                </div>
            </div>
            <footer>
                {checkoutError && <div className="store-checkout-error" role="alert">{checkoutError}</div>}
                <p aria-live="polite">{file ? file.name : 'Choose a file to continue'}</p>
                <div className="store-rom-actions">
                    <Drawer.Close className="playroom-button playroom-press" disabled={saving}>Cancel</Drawer.Close>
                    <button className="playroom-button playroom-primary playroom-press"
                        disabled={saving || !file || loading || canPurchase === false} onClick={() => { if (file) confirm(file); }}>
                        <span>{saving ? 'Saving…' : launchLabel ?? (redeeming ? 'Redeem coupon' : price === 0 ? 'Add game' : 'Buy game')}</span>
                        {price !== undefined && !economyDisabled && <strong>{redeeming ? formatPrice(0) : formatGamePrice(price)}</strong>}
                    </button>
                </div>
            </footer>
        </>
    );
}
