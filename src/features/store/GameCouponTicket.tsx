import type { ReactNode } from 'react';
import './GameCouponTicket.css';

export function GameCouponIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z" />
            <path d="M15 6v2m0 3v2m0 3v2" />
        </svg>
    );
}

export function GameCouponTicket({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="game-coupon-ticket">
            <span className="game-coupon-mark"><GameCouponIcon /></span>
            <div><strong>{title}</strong><p>{children}</p></div>
        </div>
    );
}
