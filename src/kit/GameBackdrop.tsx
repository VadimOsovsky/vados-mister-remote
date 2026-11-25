import { LazyImage } from './LazyImage';
import './GameBackdrop.css';

export function GameBackdrop({ src, fallbackSrc }: { src?: string; fallbackSrc?: string }) {
    if (!src && !fallbackSrc) return null;
    return <div className="game-backdrop" aria-hidden="true">
        <LazyImage key={src} src={src} fallbackSrc={fallbackSrc} alt="" />
    </div>;
}
