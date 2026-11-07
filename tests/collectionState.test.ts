import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useCollectionState, initializeCollectionState } from '../src/state/collectionState';
import {
    getSyncStatus, initializeSharedStorage, subscribeToSync, subscribeToValues, syncSharedStorage,
} from '../src/lib/sharedStorage';
import { addCustomGame, getFavoriteIds, getRomMapping, setFavorite } from '../src/lib/storage';
import { loadCollectionGames } from '../src/services/launchbox';
import type { LaunchBoxGame } from '../src/types';

test('collection actions publish grouped writes and pick up remote changes', async t => {
    const base = { revision: 1, values: { wallet_balance: '100' } };
    let server: { revision: number; values: Record<string, string> } = base;
    const writes: typeof server[] = [];
    t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
        if (init?.method !== 'PUT') return Response.json(server);
        const sent = JSON.parse(String(init.body)) as typeof server;
        writes.push(sent);
        if (sent.revision !== server.revision) return new Response(null, { status: 409 });
        server = { revision: server.revision + 1, values: sent.values };
        return Response.json(server);
    });

    const settled = () => new Promise<void>(resolve => {
        const unsubscribe = subscribeToSync(() => {
            if (getSyncStatus() === 'saving') return;
            unsubscribe();
            resolve();
        });
    });

    await initializeSharedStorage();
    const unsubscribe = initializeCollectionState();
    t.after(unsubscribe);
    const state = useCollectionState.getState;
    const key = state().activeConsole;

    // A second client has changed favorites since this client loaded the shared revision.
    const favoriteSettled = settled();
    setFavorite(key, 'remote-game', true);
    await favoriteSettled;
    const favoriteKey = Object.keys(server.values).find(name => name.startsWith('favorites_'));
    assert.ok(favoriteKey);
    server = { revision: server.revision + 1, values: { ...server.values, [favoriteKey]: '["new-remote-game"]' } };
    writes.length = 0;

    let changes = 0;
    const stop = subscribeToValues(() => { changes++; });
    t.after(stop);
    assert.equal(state().purchaseGame('zelda', 101, '/zelda.nes'), false);
    assert.equal(writes.length, 0);
    const purchaseSettled = settled();
    assert.equal(state().purchaseGame('zelda', 25, '/zelda.nes'), true);
    assert.equal(state().purchaseGame('zelda', 25, '/zelda.nes'), false);
    assert.equal(state().balance, 75);
    assert.equal(getRomMapping('zelda', key), '/zelda.nes');
    assert.deepEqual(state().collectionIds, ['zelda']);
    assert.equal(changes, 1);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].values.wallet_balance, '75');
    assert.match(writes[0].values.rom_mappings, /zelda/);
    assert.ok(Object.entries(writes[0].values).some(([name, value]) =>
        name.startsWith('collection_') && value === '["zelda"]'));
    const ids = state().collectionIds;
    await purchaseSettled;
    assert.equal(getSyncStatus(), 'saved');
    assert.equal(writes.length, 2);
    assert.equal(changes, 2);
    assert.deepEqual(state().favoriteIds, ['new-remote-game']);
    assert.strictEqual(state().collectionIds, ids);

    const completionSettled = settled();
    state().markAsBeaten('zelda', 'Zelda');
    const completionWrite = writes.at(-1)?.values;
    assert.equal(completionWrite?.wallet_balance, '135');
    assert.equal(completionWrite?.wallet_beaten_rewarded, '{"zelda":true}');
    assert.ok(Object.entries(completionWrite ?? {}).some(([name, value]) =>
        name.startsWith('beaten_') && value === '["zelda"]'));
    assert.deepEqual(state().completion, { title: 'Zelda', balance: 135 });
    state().unmarkAsBeaten('zelda');
    state().markAsBeaten('zelda', 'Zelda');
    assert.deepEqual(state().beatenIds, ['zelda']);
    assert.equal(state().balance, 135);
    await completionSettled;
    const freeSettled = settled();
    state().setEconomyDisabled(true);
    assert.equal(state().purchaseGame('mario', 999, '/mario.nes'), true);
    assert.equal(state().balance, 135);
    await freeSettled;

    server = { revision: server.revision + 1, values: { ...server.values, [favoriteKey]: '["conflicting"]' } };
    const conflictSettled = settled();
    state().toggleFavorite('local-game');
    await conflictSettled;
    assert.equal(getSyncStatus(), 'conflict');
    assert.deepEqual(state().favoriteIds, ['new-remote-game', 'local-game']);
    assert.deepEqual(getFavoriteIds(key), state().favoriteIds);
    const writeCount = writes.length;
    await syncSharedStorage();
    assert.equal(writes.length, writeCount);

    const custom: LaunchBoxGame = {
        id: 'custom-test', title: 'Custom test', year: '', genre: '', desc: '', developer: '',
        publisher: '', maxPlayers: '', rating: 0, ratingCount: 0, images: {},
    };
    addCustomGame(key, custom);
    assert.deepEqual(await loadCollectionGames(key, [custom.id], { requireCatalog: true }), [custom]);
});

test('collection route loader distinguishes unavailable catalog and missing ID', async t => {
    const catalog = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
    await assert.rejects(loadCollectionGames('nes_ntsc', ['existing-id'], { requireCatalog: true }));
    catalog.mock.mockImplementation(async () => Response.json([{ id: 'existing-id', title: 'Existing game' }]));
    assert.equal((await loadCollectionGames('nes_ntsc', ['existing-id'], { requireCatalog: true }))[0]?.id, 'existing-id');
    assert.deepEqual(await loadCollectionGames('nes_ntsc', ['unknown-id'], { requireCatalog: true }), []);
});
