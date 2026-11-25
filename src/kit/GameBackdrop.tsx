import { LazyImage } from './LazyImage';
import './GameBackdrop.css';

export function GameBackdrop({ src, fallbackSrc, crossOrigin }: {
    src?: string;
    fallbackSrc?: string;
    crossOrigin?: React.ImgHTMLAttributes<HTMLImageElement>['crossOrigin'];
}) {
    if (!src && !fallbackSrc) return null;
    return <div className="game-backdrop" aria-hidden="true">
        <LazyImage key={src} src={src} fallbackSrc={fallbackSrc} crossOrigin={crossOrigin} alt="" />
    </div>;
}
