import assert from 'node:assert/strict';
import { test } from 'node:test';
import { confirmSharedStorageWrites, getSyncStatus, initializeSharedStorage } from '../src/lib/sharedStorage';
import { initializeCollectionState, useCollectionState } from '../src/state/collectionState';

test('a stale device cannot spend a coupon already redeemed on another console', async t => {
    let server = {
        revision: 1,
        values: {
            active_console: 'nes_ntsc',
            owned_consoles: '["nes_ntsc","famicom"]',
            wallet_balance: '0',
            wallet_game_coupons: '{"famicom":"available"}',
        } as Record<string, string>,
    };
    t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
        if (init?.method === 'PUT') {
            const sent = JSON.parse(String(init.body)) as typeof server;
            if (sent.revision !== server.revision) return new Response(null, { status: 409 });
            server = { revision: sent.revision + 1, values: sent.values };
        }
        return Response.json(server);
    });
    await initializeSharedStorage();
    t.after(initializeCollectionState());

    // A second device redeems the same coupon in a different console's collection.
    server = { revision: 2, values: {
        ...server.values,
        active_console: 'famicom',
        wallet_game_coupons: '{"famicom":"remote-redemption"}',
        collection_famicom: '["remote-game"]',
    } };

    assert.equal(useCollectionState.getState().purchaseGame('local-game', 40, '/local.nes', 'famicom'), true);
    assert.equal(await confirmSharedStorageWrites(), false);
    assert.equal(getSyncStatus(), 'conflict');
    assert.equal(server.values.collection_famicom, '["remote-game"]');
    assert.equal(server.values.collection_nes_ntsc, undefined);
    assert.equal(server.values.wallet_balance, '0');
});
