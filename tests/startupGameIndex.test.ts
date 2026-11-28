import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStartupGameIndex } from '../src/services/startupGameIndex';
import type { WizzoWsEvent } from '../src/services/wizzoApi';

const menu = { type: 'coreRunning', name: '' } as const;
const idle = {
    type: 'indexStatus', exists: true, inProgress: false, totalSteps: 0, currentStep: 0, description: '',
} as const satisfies WizzoWsEvent;

test('startup indexing waits for an idle MiSTer menu and runs once per host', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const generateIndex = t.mock.fn(async () => {});
    const api = { wsUrl: 'ws://mister/api/ws', generateIndex };
    const handledHosts = new Set<string>();
    const index = createStartupGameIndex(api, handledHosts);

    index.onEvent(menu);
    t.mock.timers.tick(15_000);
    assert.equal(generateIndex.mock.callCount(), 0);

    index.onEvent(idle);
    t.mock.timers.tick(14_000);
    index.onEvent({ type: 'menuNavigation', folder: '/games/NES', menuItem: 'Contra' });
    t.mock.timers.tick(1_000);
    assert.equal(generateIndex.mock.callCount(), 0);

    index.onEvent({ type: 'gameRunning', system: 'NES', name: 'Contra.nes' });
    index.onEvent({ type: 'coreRunning', name: 'NES' });
    t.mock.timers.tick(15_000);
    assert.equal(generateIndex.mock.callCount(), 0);

    index.onEvent(menu);
    t.mock.timers.tick(15_000);
    assert.equal(generateIndex.mock.callCount(), 0);
    index.onEvent({ type: 'gameRunning', system: '', name: '' });
    t.mock.timers.tick(15_000);
    assert.equal(generateIndex.mock.callCount(), 1);

    const reconnected = createStartupGameIndex(api, handledHosts);
    reconnected.onEvent(idle);
    reconnected.onEvent(menu);
    t.mock.timers.tick(15_000);
    assert.equal(generateIndex.mock.callCount(), 1);
});

test('disconnect cancels pending work and an ongoing rebuild satisfies startup indexing', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const generateIndex = t.mock.fn(async () => {});
    const api = { wsUrl: 'ws://mister/api/ws', generateIndex };
    const handledHosts = new Set<string>();
    const index = createStartupGameIndex(api, handledHosts);

    index.onEvent(menu);
    index.onEvent(idle);
    index.cancel();
    t.mock.timers.tick(15_000);
    assert.equal(generateIndex.mock.callCount(), 0);

    const reconnected = createStartupGameIndex(api, handledHosts);
    reconnected.onEvent(menu);
    reconnected.onEvent(idle);
    reconnected.onEvent({ ...idle, inProgress: true });
    reconnected.onEvent(idle);
    t.mock.timers.tick(15_000);
    assert.equal(generateIndex.mock.callCount(), 0);
});
