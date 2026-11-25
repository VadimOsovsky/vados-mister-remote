import { useSyncExternalStore } from 'react';
import { getSyncStatus, subscribeToSync } from '../lib/sharedStorage';

export function StorageNotice() {
    const status = useSyncExternalStore(subscribeToSync, getSyncStatus);
    if (status !== 'conflict') return null;

    return <aside role="alert" className="storage-notice">
        Another device changed the same data. Reload to discard your unsynced changes.
        <button onClick={() => window.location.reload()}>Reload</button>
    </aside>;
}
