import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BEATEN_REWARD } from '../../lib/wallet';
import { formatPrice } from '../../lib/pricing';
import './StoreWallet.css';

function RewardBalance({ balance }: { balance: number }) {
    const [display, setDisplay] = useState(balance - BEATEN_REWARD);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let frame = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min(1, Math.max(0, (now - start - 350) / 1000));
            setDisplay(balance - Math.round(BEATEN_REWARD * Math.pow(1 - progress, 3)));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [balance]);
    return <span className="reward-balance"><span className="reward-balance-animated" aria-hidden="true">{formatPrice(display)}</span><span className="reward-balance-static" aria-hidden="true">{formatPrice(balance)}</span><span className="sr-only">Your balance: {formatPrice(balance)}</span></span>;
}

export function WalletFeedback({ notice, completion, onDismiss }: {
    notice: { amount: number; id: number } | null;
    completion: { title: string; balance: number } | null;
    onDismiss: () => void;
}) {
    const [dismissed, setDismissed] = useState<number | null>(null);
    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setDismissed(notice.id), 3200);
        return () => window.clearTimeout(timer);
    }, [notice]);
    return <>
        <div className="wallet-notice-region" role="status" aria-live="polite">
            {notice && dismissed !== notice.id && !completion && <div key={notice.id} className="wallet-notice">
                <span className="store-coin" aria-hidden="true">$</span>
                <span>{notice.amount > 0 ? 'Daily pocket money' : 'Added to your collection'}</span>
                <strong>{notice.amount > 0 ? '+' : '−'}{formatPrice(Math.abs(notice.amount))}</strong>
            </div>}
        </div>
        <Dialog.Root open={!!completion} onOpenChange={open => { if (!open) onDismiss(); }}>
            <Dialog.Portal>
                <Dialog.Overlay className="wallet-overlay reward-overlay" />
                <Dialog.Content className="completion-card" aria-describedby="completion-description">
                    <Dialog.Close className="completion-close" aria-label="Close">×</Dialog.Close>
                    <div className="completion-medal" aria-hidden="true">✓</div>
                    <p className="wallet-eyebrow">One more story on your shelf</p>
                    <Dialog.Title>Game completed!</Dialog.Title>
                    <p className="completion-game">{completion?.title}</p>
                    <Dialog.Description id="completion-description">Take a moment. You earned this.</Dialog.Description>
                    <div className="completion-reward">+{formatPrice(BEATEN_REWARD)}<small>Completion reward</small></div>
                    {completion && <div className="completion-total">Your balance <RewardBalance balance={completion.balance} /></div>}
                    <Dialog.Close className="playroom-button playroom-press">Back to my game</Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    </>;
}
