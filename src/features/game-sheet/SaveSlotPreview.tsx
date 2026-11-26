import { useEffect, useState } from 'react';
import { LazyImage } from '../../kit/LazyImage';
import { readSavePreview, writeSavePreview } from '../../services/savePreviewCache';

export function SaveSlotPreview({ url, cacheKey, connected, fallbackSrc }: {
    url: string;
    cacheKey: string;
    connected: boolean;
    fallbackSrc?: string;
}) {
    const [src, setSrc] = useState<string>();
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;
        let objectUrl: string | undefined;

        async function load() {
            let blob: Blob | undefined;
            if (connected) {
                const response = await fetch(url, {
                    cache: 'no-store',
                    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
                });
                if (signal.aborted) return;
                if (response.status === 404 || response.status === 410) {
                    void writeSavePreview(cacheKey).catch(() => {});
                }
                if (!response.ok) throw new Error('Save preview unavailable');
                blob = await response.blob();
            } else {
                blob = await readSavePreview(cacheKey);
            }
            if (signal.aborted) return;
            if (!blob?.size) throw new Error('Save preview missing');
            objectUrl = URL.createObjectURL(blob);
            const image = new Image();
            image.src = objectUrl;
            await image.decode();
            if (signal.aborted) return;
            setSrc(objectUrl);
            if (connected) void writeSavePreview(cacheKey, blob).catch(() => {});
        }

        void load().catch(() => {
            if (!signal.aborted) setUnavailable(true);
        });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [cacheKey, connected, url]);

    if (src || (unavailable && fallbackSrc)) return <LazyImage src={src || fallbackSrc} alt="" />;
    if (unavailable) return <span className="owned-save-preview-status">Preview unavailable</span>;
    return null;
}
