import { useState } from 'react';
import './LazyImage.css';

export function LazyImage({ src, fallbackSrc, alt, className, style, priority = false }: {
    src?: string;
    fallbackSrc?: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    priority?: boolean;
}) {
    const [loadedSource, setLoadedSource] = useState<string>();
    const [failedSources, setFailedSources] = useState<string[]>([]);
    const imageSrc = [src, fallbackSrc].find(source => source && !failedSources.includes(source));

    if (!imageSrc) {
        return <span className="card-art-placeholder" aria-hidden="true">🎮</span>;
    }

    return (
        <img
            key={imageSrc}
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
