import { useSyncExternalStore } from 'react';
import { getSyncStatus, subscribeToSync, syncSharedStorage } from '../lib/sharedStorage';

export function StorageNotice() {
    const status = useSyncExternalStore(subscribeToSync, getSyncStatus);
    if (status !== 'offline' && status !== 'conflict') return null;

    return <aside role="alert" className="storage-notice">
        {status === 'conflict'
            ? 'Another device changed the same data. Reload to discard your unsynced changes.'
            : 'Changes have not been saved to MiSTer.'}
        {status === 'conflict'
            ? <button onClick={() => window.location.reload()}>Reload</button>
            : <button onClick={() => void syncSharedStorage()}>Retry</button>}
    </aside>;
}
