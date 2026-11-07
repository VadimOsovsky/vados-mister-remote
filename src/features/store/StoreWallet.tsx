import { useCollectionState } from '../../state/collectionState';
import { useState } from 'react';
import { Drawer } from 'vaul';
import { BottomSheet } from '../../kit/BottomSheet';
import { DAILY_ALLOWANCE, BEATEN_REWARD, STARTING_BALANCE } from '../../lib/wallet';
import './StoreWallet.css';
import { formatPrice } from '../../lib/pricing';

export function StoreWallet({ balance, compact }: { balance: number; compact?: boolean }) {
    const [open, setOpen] = useState(false);
    const economyDisabled = useCollectionState(state => state.economyDisabled);
    if (economyDisabled) return null;
    return <>
        <button type="button" className={compact ? 'store-wallet compact' : 'store-wallet'} aria-label={'Your balance: ' + formatPrice(balance) + '. View wallet rules'} onClick={() => setOpen(true)}>
            <span className="store-coin" aria-hidden="true">$</span>
            <span>{!compact && <small>Your balance</small>}<strong>{formatPrice(balance)}</strong></span>
        </button>
        <BottomSheet open={open} onOpenChange={setOpen} autoFocus overlayClassName="wallet-overlay" className="wallet-sheet">
            <Drawer.Handle />
            <div className="wallet-sheet-content">
                <p className="wallet-eyebrow">A little towards your next adventure</p>
                <Drawer.Title>Your pocket money</Drawer.Title>
                <div className="wallet-total">{formatPrice(balance)}</div>
                <dl className="wallet-rules">
                    <div><dt>Drop by today <strong>+{formatPrice(DAILY_ALLOWANCE)}</strong></dt><dd>Automatically added on your first visit each local calendar day. Missed days do not accumulate, and there is no streak to maintain.</dd></div>
                    <div><dt>Finish a game <strong>+{formatPrice(BEATEN_REWARD)}</strong></dt><dd>Mark a save as completed to collect your reward. Once per game, even if you unmark it or add it again.</dd></div>
                    <div><dt>Your first visit <strong>{formatPrice(STARTING_BALANCE)}</strong></dt><dd>Starting money to build your shelf. Your daily allowance begins the following day.</dd></div>
                </dl>
                <p className="wallet-footnote">Just play money. Earn it here, spend it on your collection. No real-money purchases.</p>
                <Drawer.Close className="playroom-button playroom-press">Got it</Drawer.Close>
            </div>
        </BottomSheet>
    </>;
}
