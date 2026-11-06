import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildManuals } from '../scripts/build-manuals.mjs';
import { runInNewContext } from 'node:vm';

test('publishes standalone manuals, changes URL on edits and keeps stable launcher fresh', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'manuals-'));
  try {
    const source = join(temp, 'source'), output = join(temp, 'output');
    await mkdir(join(source, 'nes/demo'), { recursive: true });
    const entry = { id: 'nes/demo', title: '<Demo>', platform: 'NES', languages: ['ja', 'en', 'ru'], sourceUrl: 'https://example.com/manual.pdf' };
    await writeFile(join(source, 'catalog.json'), JSON.stringify([entry]));
    const input = join(source, 'nes/demo/index.html');
    await writeFile(input, '<!doctype html><html><body>First version</body></html>');
    const first = await buildManuals({ source, output });
    assert.match(await readFile(join(output, first.manuals[0].url), 'utf8'), /First version/);
    const same = await buildManuals({ source, output });
    assert.equal(first.manuals[0].url, same.manuals[0].url);
    await writeFile(input, '<!doctype html><html><body>Updated version</body></html>');
    const updated = await buildManuals({ source, output });
    assert.notEqual(updated.manuals[0].url, first.manuals[0].url);
    const launcher = await readFile(join(output, 'nes/demo/index.html'), 'utf8');
    assert.match(launcher, /cache: 'no-store'/);
    assert.match(launcher, /Date\.now\(\)/);
    assert.match(launcher, /\.\.\/\.\.\/manifest.json/);
    assert.match(launcher, /location.replace/);
    // Execute the SAME cached launcher against two manifest revisions. Its
    // redirect must change even if the launcher itself was never refreshed.
    const script = launcher.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
    const requests = [];
    const redirects = [];
    for (const manifest of [first, updated]) {
      const location = { href: 'https://example.com/repository/nes/demo/', search: '?lang=ru', hash: '#controls', replace: url => redirects.push(url) };
      await runInNewContext(`(async () => {${script}})()`, {
        URL, Date, Math, location,
        fetch: async (url, options) => {
          requests.push({ url: String(url), options });
          return { ok: true, json: async () => manifest };
        },
        document: { getElementById: () => ({ addEventListener() {} }) },
      });
    }
    assert.notEqual(redirects[0], redirects[1]);
    assert.equal(redirects[1], `https://example.com/repository/${updated.manuals[0].url}?lang=ru#controls`);
    assert.ok(requests.every(r => r.options.cache === 'no-store' && r.url.startsWith('https://example.com/repository/manifest.json?_=')));
    assert.notEqual(requests[0].url, requests[1].url);
    assert.match(await readFile(join(output, 'index.html'), 'utf8'), /&lt;Demo&gt;/);
    assert.match(await readFile(join(output, 'sw.js'), 'utf8'), /unregister/);
    assert.doesNotMatch(await readFile(join(output, 'sw.js'), 'utf8'), /caches.delete/);
    await writeFile(join(source, 'catalog.json'), JSON.stringify([{ ...entry, id: '../../outside' }]));
    await assert.rejects(buildManuals({ source, output }), /Invalid or duplicate/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
