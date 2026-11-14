import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { loadCollectionSave } from '../src/services/collectionLauncher';
import { appStorage } from '../src/lib/sharedStorage';
import type { WizzoApi, WizzoPlayingResponse } from '../src/services/wizzoApi';

const rom = '/media/fat/games/NES/Mario.nes';
const playing: WizzoPlayingResponse = { core: 'NES', system: 'NES', systemName: 'NES', game: 'NES/Mario.nes', gameName: 'Mario' };

function mockZaparooLaunch(t: TestContext, onLaunch: (xml: string) => void) {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket')!;
    t.after(() => Object.defineProperty(globalThis, 'WebSocket', original));
    const MockWebSocket = class {
        onopen?: () => void;
        onmessage?: (event: { data: string }) => void;
        constructor() { queueMicrotask(() => this.onopen?.()); }
        send(data: string) {
            const request = JSON.parse(data);
            onLaunch(request.params.text);
            this.onmessage?.({ data: JSON.stringify({ id: request.id, result: null }) });
        }
        close() {}
    };
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: MockWebSocket });
}

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
    t.mock.method(appStorage, 'getItem', () => JSON.stringify({ game_dendy: rom }));
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const actions: string[] = [];
    let launched = false;
    mockZaparooLaunch(t, xml => {
        assert.ok(xml.includes('<option name="System Type" value="Dendy"/>'));
        assert.ok(xml.includes(`path="${rom}"`));
        actions.push(rom);
        launched = true;
    });
    const api = {
        host: 'mister',
        getPlaying: async () => launched ? { ...playing, core: 'NES_Dendy' } : playing,
        loadState: async () => { actions.push('load'); },
    } as unknown as WizzoApi;
    const pending = loadCollectionSave(api, 'dendy', 'game', 0);
    await setImmediate();
    t.mock.timers.tick(500);
    await pending;
    assert.deepEqual(actions, [rom, 'load']);
});

test('never sends load keys if the launched ROM cannot be confirmed', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    mockZaparooLaunch(t, xml => {
        assert.ok(xml.includes('<option name="System Type" value="NTSC"/>'));
    });
    const api = {
        host: 'mister',
        getPlaying: async () => ({ ...playing, gameName: 'Another game' }),
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
