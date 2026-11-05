import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { loadCollectionSave } from '../src/services/collectionLauncher';
import { appStorage } from '../src/lib/sharedStorage';
import type { WizzoApi, WizzoPlayingResponse } from '../src/services/wizzoApi';

const rom = '/media/fat/games/NES/Mario.nes';
const playing: WizzoPlayingResponse = { core: 'NES', system: 'NES', systemName: 'NES', game: 'NES/Mario.nes', gameName: 'Mario' };

test('uses the stored ROM mapping when loading a save without an explicit ROM', async t => {
    t.mock.method(appStorage, 'getItem', () => JSON.stringify({ game_nes_ntsc: rom }));
    const slots: number[] = [];
    const api = {
        getPlaying: async () => playing,
        loadState: async (slot: number) => { slots.push(slot); },
        launchGame: async () => { assert.fail('The correct game is already running'); },
    } as unknown as WizzoApi;
    await loadCollectionSave(api, 'nes_ntsc', 'game', 2);
    assert.deepEqual(slots, [2]);
});

test('launches the linked game before loading when another ROM is running', async t => {
    t.mock.method(appStorage, 'getItem', () => JSON.stringify({ game_nes_ntsc: rom }));
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const actions: string[] = [];
    let launched = false;
    const api = {
        host: 'mister',
        getPlaying: async () => launched ? playing : { ...playing, gameName: 'Another game' },
        launchGame: async (path: string) => { actions.push(path); launched = true; },
        loadState: async () => { actions.push('load'); },
    } as unknown as WizzoApi;
    const pending = loadCollectionSave(api, 'nes_ntsc', 'game', 0);
    await setImmediate();
    t.mock.timers.tick(500);
    await pending;
    assert.deepEqual(actions, [rom, 'load']);
});

test('never sends load keys if the launched ROM cannot be confirmed', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const api = {
        host: 'mister',
        getPlaying: async () => ({ ...playing, gameName: 'Another game' }),
        launchGame: async () => {},
        loadState: async () => { assert.fail('Must not load a save into another game'); },
    } as unknown as WizzoApi;
    const rejected = assert.rejects(loadCollectionSave(api, 'nes_ntsc', 'game', 0, rom), /Could not confirm/);
    for (let attempt = 0; attempt < 30; attempt++) {
        await setImmediate();
        t.mock.timers.tick(500);
    }
    await rejected;
});

test('rejects missing ROM mappings before sending any device commands', async t => {
    t.mock.method(appStorage, 'getItem', () => null);
    const api = {
        getPlaying: async () => { assert.fail('No device commands without a mapping'); },
    } as unknown as WizzoApi;
    await assert.rejects(loadCollectionSave(api, 'nes_ntsc', 'game', 0), /No ROM mapping/);
});
