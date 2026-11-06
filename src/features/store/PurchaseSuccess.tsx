import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { LazyImage } from '../../kit/LazyImage';
import './PurchaseSuccess.css';

export function PurchaseSuccess({ title, cover, preview, variant = 'purchase' }: { title: string; cover?: string; preview: boolean; variant?: 'purchase' | 'addition' }) {
    const navigate = useNavigate();
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus({ preventScroll: true });
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const timer = window.setTimeout(() => {
            navigate('/collection' + (preview ? '?preview=1' : ''), { replace: true });
        }, reducedMotion ? 1000 : 2600);
        return () => window.clearTimeout(timer);
    }, [navigate, preview]);

    return <main className="purchase-success">
        <div className="purchase-success-art" aria-hidden="true">
            <div className="purchase-success-confetti">
                {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
            </div>
            <div className="purchase-success-cover">
                {cover ? <LazyImage src={cover} alt="" /> : <span>★</span>}
            </div>
            <div className="purchase-success-shelf" />
            <span className="purchase-success-check">✓</span>
        </div>
        <div className="purchase-success-message" role="status">
            <p className="purchase-success-kicker">A new adventure awaits</p>
            <h1 ref={headingRef} tabIndex={-1}>{variant === 'addition' ? 'A new game on your shelf.' : 'Voilà! It’s yours.'}</h1>
            <p className="purchase-success-title">{title}</p>
            <p className="purchase-success-caption">Added to your collection</p>
            <p className="purchase-success-caption">Taking you to your collection…</p>
        </div>
    </main>;
}
