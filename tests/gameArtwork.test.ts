import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanGameOverrides, resolveGameArtwork } from '../src/lib/gameArtwork';
import { getDisplayGameOverrides } from '../src/lib/storage';
import { appStorage } from '../src/lib/sharedStorage';
import type { GameOverrides } from '../src/types';

const original: GameOverrides = {
    title: 'Cats', boxFrontUrl: '/original-front.jpg', boxBackUrl: '/original-back.jpg',
    cartridgeUrl: '/original-cart.jpg', manualPhotoUrl: '/original-manual.jpg', manualUrl: 'https://example.org/original.pdf',
    artworkByLanguage: {
        English: { boxFrontUrl: '/english.jpg', manualUrl: 'https://example.org/english.pdf' },
        'Русский': { cartridgeUrl: '/russian-cart.jpg', manualPhotoUrl: '   ' },
    },
};

test('translated artwork falls back to originals for each missing field', () => {
    assert.deepEqual(resolveGameArtwork(original, 'English'), {
        boxFrontUrl: '/english.jpg', boxBackUrl: '/original-back.jpg', cartridgeUrl: '/original-cart.jpg',
        manualPhotoUrl: '/original-manual.jpg', manualUrl: 'https://example.org/english.pdf',
    });
    assert.equal(resolveGameArtwork(original, 'Русский').cartridgeUrl, '/russian-cart.jpg');
    assert.equal(resolveGameArtwork(original, 'Русский').manualPhotoUrl, '/original-manual.jpg');
});

test('original and unconfigured languages preserve the original materials', () => {
    for (const language of ['original', 'Deutsch']) assert.equal(resolveGameArtwork(original, language).boxFrontUrl, '/original-front.jpg');
    assert.equal(resolveGameArtwork({}).boxFrontUrl, undefined);
});

test('saving edits preserves all languages and omits empty language sets', () => {
    const draft = { ...original, artworkByLanguage: { ...original.artworkByLanguage, Deutsch: { boxFrontUrl: '  ' } } };
    const cleaned = cleanGameOverrides(draft, { title: 'Cats', boxFrontUrl: '/original-front.jpg' });
    assert.equal(cleaned.title, undefined);
    assert.equal(cleaned.boxFrontUrl, undefined);
    assert.deepEqual(cleaned.artworkByLanguage, {
        English: original.artworkByLanguage!.English, 'Русский': { cartridgeUrl: '/russian-cart.jpg' },
    });
    assert.equal(draft.artworkByLanguage['Русский'].manualPhotoUrl, '   ', 'draft is not mutated');
});

test('clearing the last translated image restores the original and removes the empty set', () => {
    const cleaned = cleanGameOverrides({ ...original, artworkByLanguage: { English: { boxFrontUrl: '' } } });
    assert.equal(cleaned.artworkByLanguage, undefined);
    assert.equal(resolveGameArtwork(cleaned, 'English').boxFrontUrl, '/original-front.jpg');
});

test('legacy original overrides round-trip without migration', () => {
    const legacy = { title: 'Cats', cartridgeUrl: '/cart.jpg', manualUrl: 'https://example.org/manual.pdf' };
    assert.deepEqual(cleanGameOverrides(legacy), legacy);
});

test('web manual is saved once for the game alongside independent localized PDFs', () => {
    const cleaned = cleanGameOverrides({ ...original, webManualUrl: '  https://example.org/nes/mario/  ' });
    assert.equal(cleaned.webManualUrl, 'https://example.org/nes/mario/');
    assert.equal(cleaned.manualUrl, original.manualUrl);
    assert.equal(cleaned.artworkByLanguage?.English.manualUrl, original.artworkByLanguage?.English.manualUrl);
    assert.equal(cleanGameOverrides({ ...cleaned, webManualUrl: '' }).webManualUrl, undefined);
});

test('collection artwork follows selected ROM language while keeping other fields original', t => {
    t.mock.method(appStorage, 'getItem', key => key.startsWith('game_overrides_') ? JSON.stringify(original)
        : key.startsWith('game_rom_versions_') ? JSON.stringify({ selected: '/English.nes', translations: [{ language: 'English', path: '/English.nes' }] }) : null);
    const displayed = getDisplayGameOverrides('cats', 'famicom');
    assert.equal(displayed.boxFrontUrl, '/english.jpg');
    assert.equal(displayed.cartridgeUrl, '/original-cart.jpg');
    assert.equal(displayed.title, 'Cats');
});
