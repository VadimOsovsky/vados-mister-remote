import { useState } from 'react';

export function LazyImage({ src, alt, className, style }: {
    src?: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    if (!src || error) {
        return <div className="card-art-placeholder">🎮</div>;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`${className || ''} ${loaded ? 'loaded' : ''}`}
            style={style}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
        />
    );
}
