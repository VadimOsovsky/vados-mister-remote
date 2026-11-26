import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appStorage, getSyncStatus, handleSharedStorageChange, initializeSharedStorage, setSharedStorageOnline, syncSharedStorage } from '../src/lib/sharedStorage';
import { visitWallet } from '../src/lib/wallet';

test('offline wallet visits survive a failed sync and merge by date with newer wallet updates', async t => {
    const stored: Record<string, string> = {};
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const storage = new Proxy(stored, {
        get(target, key, receiver) {
            if (key === 'getItem') return (name: string) => target[name] ?? null;
            if (key === 'setItem') return (name: string, value: string) => { target[name] = value; };
            if (key === 'removeItem') return (name: string) => { delete target[name]; };
            return Reflect.get(target, key, receiver);
        },
    });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    t.after(() => {
        if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
        else Reflect.deleteProperty(globalThis, 'localStorage');
    });
    let loseResponse = true;
    let writes = 0;
    let conflict = true;
    let server = {
        revision: 1,
        values: { wallet_balance: '85', wallet_last_topup: '2026-11-01' } as Record<string, string>,
    };
    t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
        if (init?.method === 'PUT') {
            writes++;
            const update = JSON.parse(String(init.body)) as typeof server;
            if (conflict) {
                conflict = false;
                server = { revision: server.revision + 1, values: { ...server.values, wallet_balance: '45' } };
                return new Response(null, { status: 409 });
            }
            assert.equal(update.revision, server.revision);
            server = { revision: server.revision + 1, values: update.values };
            if (loseResponse) throw new Error('Connection lost after write');
        }
        return Response.json(server);
    });
    await initializeSharedStorage();
    setSharedStorageOnline(false);

    const date = (day: number) => new Date(2026, 10, day, 12);
    assert.deepEqual(visitWallet(date(2)), { balance: 90, reward: 5 });
    assert.deepEqual(visitWallet(date(2)), { balance: 90, reward: 0 });
    assert.deepEqual(visitWallet(date(4)), { balance: 95, reward: 5 });
    assert.equal(Object.keys(stored).filter(key => key.includes(':wallet-visit:')).length, 2);
    assert.equal(writes, 0);

    // Another device spent money and already received the allowance for the fourth.
    server = { revision: 2, values: {
        wallet_balance: '50', wallet_last_topup: '2026-11-04',
        wallet_allowance_since: '2026-11-01', 'wallet_visit_2026-11-04': 'true',
    } };
    setSharedStorageOnline(true);
    await syncSharedStorage();
    assert.equal(getSyncStatus(), 'offline');
    assert.equal(server.values.wallet_balance, '50');
    assert.equal(Object.keys(stored).filter(key => key.includes(':wallet-visit:')).length, 2);

    loseResponse = false;
    await syncSharedStorage();
    assert.equal(getSyncStatus(), 'saved');
    assert.equal(appStorage.getItem('wallet_balance'), '50');
    assert.equal(server.values.wallet_last_topup, '2026-11-04');
    assert.equal(writes, 2);
    assert.equal(Object.keys(stored).filter(key => key.includes(':wallet-visit:')).length, 0);

    // An offline tab also sees the snapshot another tab cached before clearing its queue.
    setSharedStorageOnline(false);
    const key = 'playroom.snapshot:/api/playroom/state';
    const newer = { revision: server.revision + 1, values: { ...server.values, wallet_balance: '60' } };
    stored[key] = JSON.stringify(newer);
    handleSharedStorageChange(key);
    assert.equal(appStorage.getItem('wallet_balance'), '60');
    assert.deepEqual(visitWallet(date(5)), { balance: 65, reward: 5 });
});
