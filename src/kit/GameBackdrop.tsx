import { LazyImage } from './LazyImage';
import './GameBackdrop.css';

export function GameBackdrop({ src }: { src?: string }) {
    if (!src) return null;
    return <div className="game-backdrop" aria-hidden="true">
        <LazyImage key={src} src={src} alt="" />
    </div>;
}
