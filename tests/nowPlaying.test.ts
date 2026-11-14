import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRomPlaying, samePlayingGame } from '../src/services/nowPlaying';
import type { WizzoPlayingResponse } from '../src/services/wizzoApi';

const rom = '/media/fat/games/NES/Super Mario Bros. 3 (USA).nes';
const playing: WizzoPlayingResponse = {
    core: 'NES', system: 'NES', systemName: 'NES',
    game: 'NES/Super Mario Bros. 3 (USA).nes', gameName: 'Super Mario Bros. 3 (USA)',
};

test('matches linked ROM filenames, including backslashes and dots in titles', () => {
    assert.equal(isRomPlaying(playing, rom, 'nes_ntsc'), true);
    assert.equal(isRomPlaying(playing, rom.replaceAll('/', '\\'), 'nes_ntsc'), true);
    assert.equal(isRomPlaying(playing, '/games/NES/Another game.nes', 'nes_ntsc'), false);
});

test('matches MGL launches by the resolved ROM path and console variant', () => {
    const mgl = { ...playing, game: 'NES/3159481354.mgl', gameName: '3159481354', romPath: rom };
    assert.equal(isRomPlaying(mgl, rom, 'nes_ntsc'), true);
    assert.equal(isRomPlaying(mgl, rom, 'nes_pal'), false);
    assert.equal(isRomPlaying(mgl, rom.replace('/games/', '/backup/'), 'nes_ntsc'), false);
    assert.equal(samePlayingGame(mgl, { ...mgl, romPath: undefined }), false);
});

test('does not match missing mappings, empty state or another system', () => {
    assert.equal(isRomPlaying(null, rom, 'nes_ntsc'), false);
    assert.equal(isRomPlaying(playing, null, 'nes_ntsc'), false);
    assert.equal(isRomPlaying({ ...playing, core: '' }, rom, 'nes_ntsc'), false);
    assert.equal(isRomPlaying({ ...playing, gameName: '' }, rom, 'nes_ntsc'), false);
    assert.equal(isRomPlaying(playing, rom, 'fds'), false);
});

test('distinguishes PAL and Dendy setnames sharing the NES system ID', () => {
    const pal = { ...playing, core: 'NES_PAL' };
    const dendy = { ...playing, core: 'NES_Dendy' };
    assert.equal(isRomPlaying(pal, rom, 'nes_pal'), true);
    assert.equal(isRomPlaying(dendy, rom, 'dendy'), true);
    assert.equal(isRomPlaying(pal, rom, 'nes_ntsc'), false);
    assert.equal(isRomPlaying(pal, rom, 'dendy'), false);
    assert.equal(isRomPlaying(dendy, rom, 'nes_pal'), false);
    assert.equal(isRomPlaying(playing, rom, 'nes_pal'), false);
});

test('Famicom and AV Famicom may share the same linked ROM', () => {
    assert.equal(isRomPlaying(playing, rom, 'famicom'), true);
    assert.equal(isRomPlaying(playing, rom, 'av_famicom'), true);
});

test('identical status responses do not require another UI update', () => {
    assert.equal(samePlayingGame(playing, { ...playing }), true);
    assert.equal(samePlayingGame(null, null), true);
    assert.equal(samePlayingGame(playing, null), false);
    assert.equal(samePlayingGame(playing, { ...playing, core: 'NES_PAL' }), false);
    assert.equal(samePlayingGame(playing, { ...playing, gameName: 'Another game' }), false);
    assert.equal(samePlayingGame(playing, { ...playing, systemName: 'New name' }), false);
});
