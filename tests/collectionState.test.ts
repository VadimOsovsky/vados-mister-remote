import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gameResalePrice, useCollectionState, initializeCollectionState } from '../src/state/collectionState';
import {
    appStorage, confirmSharedStorageWrites, getSyncStatus, initializeSharedStorage, isSharedStorageReady, setSharedStorageOnline,
    subscribeToSync, subscribeToValues, syncSharedStorage,
} from '../src/lib/sharedStorage';
import { addCustomGame, availableGameCoupons, getFavoriteIds, getRomMapping, setFavorite } from '../src/lib/storage';
import { consolePrice } from '../src/lib/consolePricing';
import { loadCollectionGames } from '../src/services/launchbox';
import type { LaunchBoxGame } from '../src/types';

test('console purchases debit the wallet and persist ownership in one shared update', async t => {
    const stored = new Map<string, string>();
    const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
    } });
    t.after(() => {
        if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
        else Reflect.deleteProperty(globalThis, 'localStorage');
    });
    let server = { revision: 1, values: { wallet_balance: '159', owned_consoles: '["nes_ntsc"]' } as Record<string, string> };
    const writes: typeof server[] = [];
    t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
        if (init?.method === 'PUT') {
            const purchase = JSON.parse(String(init.body)) as typeof server;
            writes.push(purchase);
            server = { revision: server.revision + 1, values: purchase.values };
        }
        return Response.json(server);
    });
    assert.equal(consolePrice('famicom', ['nes_ntsc']), 160);
    assert.equal(consolePrice('snes_us', ['nes_ntsc']), 160);
    await initializeSharedStorage();
    const stop = initializeCollectionState();
    t.after(stop);
    const state = useCollectionState.getState;
    assert.deepEqual(state().ownedConsoles, ['nes_ntsc']);
    state().setActiveConsole('famicom');
    assert.equal(state().activeConsole, 'nes_ntsc');
    assert.equal(state().purchaseConsole('famicom'), false);
    assert.deepEqual(availableGameCoupons(state().gameCoupons), []);
    assert.equal(writes.length, 0);

    server.values = { ...server.values, wallet_balance: '160' };
    await initializeSharedStorage();
    const saved = new Promise<void>(resolve => {
        const unsubscribe = subscribeToSync(() => {
            if (getSyncStatus() === 'saving') return;
            unsubscribe();
            resolve();
        });
    });
    assert.equal(state().purchaseConsole('famicom'), true);
    assert.equal(state().purchaseConsole('famicom'), false);
    assert.equal(state().balance, 0);
    assert.deepEqual(state().ownedConsoles, ['nes_ntsc', 'famicom']);
    assert.deepEqual(availableGameCoupons(state().gameCoupons), ['famicom']);
    await saved;
    assert.equal(writes.length, 1);
    assert.equal(writes[0].values.wallet_balance, '0');
    assert.equal(writes[0].values.owned_consoles, '["nes_ntsc","famicom"]');
    assert.equal(writes[0].values.wallet_game_coupons, '{"famicom":"available"}');

    const cache = JSON.parse(localStorage.getItem('playroom.snapshot:/api/playroom/state') ?? 'null');
    assert.deepEqual(cache, server);
    setSharedStorageOnline(false);
    assert.equal(isSharedStorageReady(), false);
    appStorage.setItem('wallet_balance', '999');
    appStorage.removeItem('owned_consoles');
    assert.equal(state().purchaseGame('offline', 0, '/offline.nes'), false);
    assert.equal(state().purchaseGame('offline', 25, '/offline.nes', 'famicom'), false);
    assert.deepEqual(availableGameCoupons(state().gameCoupons), ['famicom']);
    assert.equal(appStorage.getItem('wallet_balance'), '0');
    assert.equal(appStorage.getItem('owned_consoles'), '["nes_ntsc","famicom"]');
    assert.equal(writes.length, 1);

    server = { revision: server.revision + 1, values: { ...server.values, wallet_balance: '25' } };
    setSharedStorageOnline(true);
    await syncSharedStorage();
    assert.equal(isSharedStorageReady(), true);
    assert.equal(state().balance, 25);
    assert.equal(writes.length, 1);

    server = { revision: server.revision + 1, values: { ...server.values, wallet_balance: '30' } };
    await syncSharedStorage(true);
    assert.equal(state().balance, 30);
    assert.deepEqual(JSON.parse(stored.get('playroom.snapshot:/api/playroom/state') ?? 'null'), server);
    assert.equal(writes.length, 1);

    // A coupon earned from the Famicom works on the active NES without touching the wallet.
    assert.equal(state().activeConsole, 'nes_ntsc');
    assert.equal(state().purchaseGame('coupon-game', 55, '/coupon-game.nes'), false);
    assert.equal(state().purchaseGame('coupon-game', 55, '/coupon-game.nes', 'nes_pal'), false);
    assert.equal(state().purchaseGame('coupon-game', 55, '/coupon-game.nes', 'famicom'), true);
    assert.equal(state().purchaseGame('second-game', 55, '/second-game.nes', 'famicom'), false);
    assert.equal(state().balance, 30);
    assert.deepEqual(state().collectionIds, ['coupon-game']);
    assert.deepEqual(availableGameCoupons(state().gameCoupons), []);
    assert.equal(getRomMapping('coupon-game', 'nes_ntsc'), '/coupon-game.nes');
    assert.equal(await confirmSharedStorageWrites(), true);
    const redemption = writes.at(-1)?.values;
    assert.equal(redemption?.wallet_balance, '30');
    assert.equal(redemption?.collection_nes_ntsc, '["coupon-game"]');
    assert.match(redemption?.rom_mappings ?? '', /coupon-game\.nes/);
    assert.equal(JSON.parse(redemption?.wallet_game_coupons ?? '{}').famicom, state().gameCoupons.famicom);

    state().setActiveConsole('famicom');
    await syncSharedStorage();
    const game: LaunchBoxGame = {
        id: 'resale-test', title: 'Resale test', year: '', genre: '', desc: '', developer: '',
        publisher: '', maxPlayers: '', rating: 5, ratingCount: 1, images: {},
    };
    assert.equal(state().purchaseGame(game.id, 9.99, '/resale.nes'), true);
    assert.equal(gameResalePrice(game), 38.5);
    assert.equal(state().sellGame('famicom', game, 6.99), false);
    assert.equal(state().sellGame('famicom', game, 38.5), true);
    assert.equal(state().sellGame('famicom', game, 38.5), false);
    assert.equal(state().balance, 58.51);
    assert.equal(getRomMapping(game.id, 'famicom'), '/resale.nes');
    state().setEconomyDisabled(true);
    assert.equal(state().purchaseGame(game.id, 55, '/resale.nes'), true);
    state().setEconomyDisabled(false);

    assert.equal(state().sellConsole('nes_ntsc', 112), false);
    assert.equal(state().sellConsole('famicom', 56), false);
    assert.equal(state().sellConsole('famicom', 112), true);
    assert.equal(state().sellConsole('famicom', 112), false);
    assert.equal(state().activeConsole, 'nes_ntsc');
    assert.equal(state().balance, 170.51);
    assert.equal(state().purchaseConsole('famicom'), true);
    assert.deepEqual(availableGameCoupons(state().gameCoupons), []);
    state().setActiveConsole('famicom');
    assert.deepEqual(state().collectionIds, [game.id]);
    state().setEconomyDisabled(true);
    assert.equal(state().purchaseConsole('nes_pal'), true);
    assert.equal(state().gameCoupons.nes_pal, undefined);
    assert.equal(await confirmSharedStorageWrites(), true);
});

test('collection actions publish grouped writes and pick up remote changes', async t => {
    const base = { revision: 1, values: { wallet_balance: '100', owned_consoles: '["nes_ntsc","famicom"]', collection_famicom: '["another-game"]' } };
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
    assert.equal(completionWrite?.wallet_balance, '150');
    assert.equal(completionWrite?.wallet_beaten_rewarded, '{"zelda":true}');
    assert.ok(Object.entries(completionWrite ?? {}).some(([name, value]) =>
        name.startsWith('beaten_') && value === '["zelda"]'));
    assert.deepEqual(state().completion, { title: 'Zelda', balance: 150 });
    state().unmarkAsBeaten('zelda');
    state().markAsBeaten('zelda', 'Zelda');
    assert.deepEqual(state().beatenIds, ['zelda']);
    assert.equal(state().balance, 150);
    await completionSettled;
    const freeSettled = settled();
    state().setEconomyDisabled(true);
    assert.equal(state().purchaseGame('mario', 999, '/mario.nes'), true);
    assert.equal(state().balance, 150);
    await freeSettled;

    state().setEconomyDisabled(false);
    assert.equal(await confirmSharedStorageWrites(), true);
    const remoteValues = { ...server.values, wallet_balance: '167.5', collection_famicom: '[]' };
    server = { revision: server.revision + 1, values: remoteValues };
    const conflictSettled = settled();
    const zelda: LaunchBoxGame = {
        id: 'zelda', title: 'Zelda', year: '', genre: '', desc: '', developer: '',
        publisher: '', maxPlayers: '', rating: 0, ratingCount: 0, images: {},
    };
    assert.equal(state().sellGame(key, zelda, 17.5), true);
    await conflictSettled;
    assert.equal(getSyncStatus(), 'conflict');
    assert.deepEqual(server.values, remoteValues);
    assert.deepEqual(state().favoriteIds, ['new-remote-game']);
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
