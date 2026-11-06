import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appStorage } from '../src/lib/sharedStorage';
import { addRomTranslation, getGameSaveKey, getOriginalRomMapping, getRomMapping, getRomVersions, getSaveSlots, putSaveSlot, selectRomVersion, setRomMapping } from '../src/lib/storage';

test('translations preserve original mapping and saves and remember the selected version', t => {
    const data = new Map<string, string>();
    t.mock.method(appStorage, 'getItem', key => data.get(key) ?? null);
    t.mock.method(appStorage, 'setItem', (key, value) => { data.set(key, value); });
    setRomMapping('cats', 'famicom', '/NES/Cats (Japan).nes');
    const original = { slotIndex: 0, savedAt: '2026-11-06', gameName: 'Cats' };
    putSaveSlot('cats', 0, original);
    addRomTranslation('cats', 'famicom', 'English', '/NES/Cats (English).nes');
    assert.equal(getRomMapping('cats', 'famicom'), '/NES/Cats (Japan).nes');
    selectRomVersion('cats', 'famicom', '/NES/Cats (English).nes');
    assert.equal(getRomMapping('cats', 'famicom'), '/NES/Cats (English).nes');
    assert.equal(getOriginalRomMapping('cats', 'famicom'), '/NES/Cats (Japan).nes');
    const key = getGameSaveKey('cats', 'famicom');
    assert.deepEqual(getSaveSlots(key), [null, null, null, null]);
    putSaveSlot(key, 1, { ...original, slotIndex: 1 });
    assert.deepEqual(getSaveSlots('cats'), [original, null, null, null]);
    selectRomVersion('cats', 'famicom', null);
    assert.equal(getGameSaveKey('cats', 'famicom'), 'cats');
    selectRomVersion('cats', 'famicom', '/NES/Cats (English).nes');
    assert.ok(getSaveSlots(getGameSaveKey('cats', 'famicom'))[1]);
    assert.equal(getRomMapping('cats', 'nes_ntsc'), null);
    assert.throws(() => addRomTranslation('cats', 'famicom', 'English', '/NES/Cats (English).nes'), /already linked/);
    assert.throws(() => addRomTranslation('cats', 'famicom', 'English', '/Other/Cats (Japan).nes'), /distinct filename/);
    assert.throws(() => addRomTranslation('cats', 'famicom', '  ', '/Other.nes'), /Choose/);
    assert.throws(() => selectRomVersion('cats', 'famicom', '/unknown.nes'), /Unknown/);
});

test('invalid stored selection falls back to original without borrowing translation slots', t => {
    t.mock.method(appStorage, 'getItem', key => key.startsWith('game_rom_versions_')
        ? JSON.stringify({ selected: '/missing.nes', translations: [{ language: 'English', path: '/English.nes' }] })
        : key === 'rom_mappings' ? JSON.stringify({ cats_famicom: '/Japan.nes' }) : null);
    assert.equal(getRomVersions('cats', 'famicom').selected, null);
    assert.equal(getRomMapping('cats', 'famicom'), '/Japan.nes');
    assert.equal(getGameSaveKey('cats', 'famicom'), 'cats');
});
