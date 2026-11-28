const route = '/api/playroom/artwork';
const uploadPath = /^\/api\/playroom\/artwork\/[a-f0-9]{64}\.webp$/;
const apiOrigin = import.meta.env?.VITE_PLAYROOM_API_ORIGIN?.trim().replace(/\/+$/, '') ?? '';

export function isUploadedCover(value: string) {
    return uploadPath.test(value);
}

export function coverImageUrl(value: string) {
    return isUploadedCover(value) ? apiOrigin + value : value;
}

export function collectionCoverUrl(src: string) {
    return isUploadedCover(src) || isRemoteUploadedCover(src) ? `${src}?collection-cover=1` : src;
}

function isRemoteUploadedCover(src: string) {
    return Boolean(apiOrigin && src.startsWith(apiOrigin) && isUploadedCover(src.slice(apiOrigin.length)));
}

export function coverImageCrossOrigin(src: string) {
    return isRemoteUploadedCover(src.replace(/\?collection-cover=1$/, '')) ? 'anonymous' as const : undefined;
}

export async function uploadCover(file: File, version: 'preview' | 'full') {
    let image: Blob;
    try {
        const bitmap = await createImageBitmap(file);
        try {
            const maxSide = version === 'preview' ? 480 : 3200;
            const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            const context = canvas.getContext('2d');
            if (!context) throw new Error();
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.92));
            if (blob?.type !== 'image/webp') throw new Error();
            image = blob;
        } finally {
            bitmap.close();
        }
    } catch {
        throw new Error('Could not open this image. Try a JPEG, PNG, or WebP file.');
    }

    try {
        const response = await fetch(apiOrigin + route, {
            method: 'POST', body: image, signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error();
        const { path } = await response.json();
        if (typeof path !== 'string' || !isUploadedCover(path)) throw new Error();
        return path;
    } catch {
        throw new Error('Could not upload the image to MiSTer. Check the connection and try again.');
    }
}
