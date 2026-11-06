import assert from 'node:assert/strict';
import { test } from 'node:test';
import { viewportLayout } from '../src/lib/viewportLayout';

test('standalone safe-area discrepancy does not shorten the app', () => {
    const layout = viewportLayout(874, 812, 0, false);
    assert.equal(layout.height, '100dvh');
    assert.equal(layout.bottom, '0px');
    assert.equal(viewportLayout(874, 812, 0, true).height, '100dvh');
});
test('keyboard resizes the app and removes the home-indicator inset', () => {
    assert.deepEqual(viewportLayout(874, 480, 30, true), {
        height: '480px', top: '30px', bottom: '364px', safeBottom: '0px',
    });
});

test('installed PWA uses the full vh height rather than the inset dynamic viewport', () => {
    assert.equal(viewportLayout(874, 812, 0, false, true).height, '100vh');
    assert.equal(viewportLayout(874, 812, 0, true, true).height, '100vh');
    assert.equal(viewportLayout(874, 480, 30, true, true).height, '480px');
    assert.equal(viewportLayout(874, 480, 30, false, true).height, '100vh');
});
test('leaving an input restores full height despite stale viewport measurements', () => {
    const layout = viewportLayout(874, 480, 30, false);
    assert.equal(layout.height, '100dvh');
    assert.equal(layout.top, '0px');
    assert.equal(layout.bottom, '0px');
});
