import './StoreWallet.css';
import { formatPrice } from '../../lib/pricing';

export function StoreWallet({ balance, compact }: { balance: number; compact?: boolean }) {
    return (
        <div className={compact ? 'store-wallet compact' : 'store-wallet'} aria-label={'Your balance: ' + formatPrice(balance)}>
            <span className="store-coin" aria-hidden="true">$</span>
            <span>{!compact && <small>Your balance</small>}<strong>{formatPrice(balance)}</strong></span>
        </div>
    );
}
