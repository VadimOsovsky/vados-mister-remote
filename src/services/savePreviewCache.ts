const storeName = 'previews';
const limit = 50;

interface PreviewEntry {
    key: string;
    image: Blob;
    updatedAt: number;
}

function openCache(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('mister-save-previews', 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(storeName, { keyPath: 'key' }).createIndex('updatedAt', 'updatedAt');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function readSavePreview(key: string): Promise<Blob | undefined> {
    const db = await openCache();
    try {
        return await new Promise((resolve, reject) => {
            const request = db.transaction(storeName).objectStore(storeName).get(key);
            request.onsuccess = () => resolve((request.result as PreviewEntry | undefined)?.image);
            request.onerror = () => reject(request.error);
        });
    } finally {
        db.close();
    }
}

export async function writeSavePreview(key: string, image?: Blob): Promise<void> {
    const db = await openCache();
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error);
            const store = transaction.objectStore(storeName);
            if (!image) {
                store.delete(key);
                return;
            }
            store.put({ key, image, updatedAt: Date.now() } satisfies PreviewEntry);
            // Keep the write and eviction atomic, including when other tabs cache previews.
            const keys = store.index('updatedAt').getAllKeys();
            keys.onsuccess = () => {
                for (const oldKey of keys.result.slice(0, Math.max(0, keys.result.length - limit))) {
                    store.delete(oldKey);
                }
            };
        });
    } finally {
        db.close();
    }
}
