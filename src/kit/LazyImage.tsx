import { useState } from 'react';
import './LazyImage.css';

export function LazyImage({ src, fallbackSrc, fallbackSrcs = [], alt, className, style, priority = false, crossOrigin }: {
    src?: string;
    fallbackSrc?: string;
    fallbackSrcs?: string[];
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    priority?: boolean;
    crossOrigin?: React.ImgHTMLAttributes<HTMLImageElement>['crossOrigin'] | ((src: string) => React.ImgHTMLAttributes<HTMLImageElement>['crossOrigin']);
}) {
    const [loadedSource, setLoadedSource] = useState<string>();
    const [failedSources, setFailedSources] = useState<string[]>([]);
    const imageSrc = [src, fallbackSrc, ...fallbackSrcs].find(source => source && !failedSources.includes(source));

    if (!imageSrc) {
        return <span className="card-art-placeholder" aria-hidden="true">🎮</span>;
    }

    return (
        <img
            key={imageSrc}
            crossOrigin={typeof crossOrigin === 'function' ? crossOrigin(imageSrc) : imageSrc === src ? crossOrigin : undefined}
            src={imageSrc}
            alt={alt}
            className={`lazy-image ${className || ''}`}
            data-loaded={loadedSource === imageSrc}
            style={style}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            onLoad={() => setLoadedSource(imageSrc)}
            onError={() => setFailedSources(sources => [...sources, imageSrc])}
        />
    );
}
