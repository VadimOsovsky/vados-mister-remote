import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const escapeHtml = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const shell = (title, content, script) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:800px;margin:48px auto;padding:0 24px;background:#fffaf0;color:#25221c}a{color:inherit}li{margin:16px 0}button{font:inherit;padding:8px 16px}</style></head>
<body>${content}<script type="module">${script}</script></body></html>`;

// Stable launchers always resolve the current manifest. They never cache a manual.
// A timestamp also avoids intermediary caches ignoring browser cache directives.
const loader = `
async function latestManifest(path) {
  const url = new URL(path, location.href);
  url.searchParams.set('_', Date.now() + '-' + Math.random().toString(36).slice(2));
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load manual list (' + response.status + ')');
  return response.json();
}
function failed(error) {
  document.getElementById('status').textContent = error.message + '. Please try again.';
  document.getElementById('retry').hidden = false;
}
document.getElementById('retry').addEventListener('click', () => location.reload());
`;
const status = '<p id="status" role="status">Loading…</p><button id="retry" type="button" hidden>Try again</button>';

export async function buildManuals({ source = join(projectRoot, 'manuals'), output = join(projectRoot, 'manuals-dist') } = {}) {
  const catalog = JSON.parse(await readFile(join(source, 'catalog.json'), 'utf8'));
  if (!Array.isArray(catalog) || catalog.length === 0) throw new Error('Manual catalog must be a nonempty array');
  const seen = new Set();
  const manifest = { manuals: [] };
  // Do not delete directories: CI starts with a clean output; local stale hashes
  // are harmless and may still be referenced by tabs open before a rebuild.
  await mkdir(output, { recursive: true });
  for (const entry of catalog) {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(entry.id) || seen.has(entry.id)) throw new Error(`Invalid or duplicate manual id: ${entry.id}`);
    if (typeof entry.title !== 'string' || !entry.title.trim() || typeof entry.platform !== 'string' || !Array.isArray(entry.languages) || !entry.languages.length || entry.languages.some(l => !/^[a-z]{2,3}$/.test(l))) throw new Error(`Invalid metadata: ${entry.id}`);
    if (new URL(entry.sourceUrl).protocol !== 'https:') throw new Error(`Source must use HTTPS: ${entry.id}`);
    seen.add(entry.id);
    const html = await readFile(join(source, entry.id, 'index.html'), 'utf8');
    if (!/<!doctype html>/i.test(html) || !/<html\b/i.test(html)) throw new Error(`Expected standalone HTML: ${entry.id}`);
    if (/(?:src|href)\s*=\s*["']\s*(?:\.\.?\/|\/)/i.test(html) || /<(?:script|link|img)\b[^>]*(?:src|href)\s*=\s*["']\s*https?:/i.test(html)) throw new Error(`Manual must embed its assets: ${entry.id}`);
    const hash = createHash('sha256').update(html).digest('hex').slice(0, 20);
    const directory = join(output, entry.id);
    const filename = `manual.${hash}.html`;
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), html);
    manifest.manuals.push({ ...entry, revision: hash, url: `${entry.id}/${filename}`, bytes: Buffer.byteLength(html) });
    const depth = entry.id.split('/').length;
    const prefix = '../'.repeat(depth);
    const script = `${loader}
try {
  const manifest = await latestManifest(${JSON.stringify(prefix + 'manifest.json')});
  const entry = manifest.manuals.find(m => m.id === ${JSON.stringify(entry.id)});
  if (!entry) throw new Error('Manual is no longer available');
  const target = new URL(${JSON.stringify(prefix)} + entry.url, location.href);
  // Preserve language anchors/query parameters supplied by a caller.
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
} catch (error) { failed(error); }`;
    await writeFile(join(directory, 'index.html'), shell(entry.title, `<h1>${escapeHtml(entry.title)}</h1>${status}<noscript>JavaScript is required to resolve the latest revision. Open the manual from the catalog instead.</noscript>`, script));
  }
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const list = manifest.manuals.map(m => `<li><a href="${escapeHtml(m.id)}/">${escapeHtml(m.title)}</a> · ${escapeHtml(m.platform)} · ${m.languages.map(escapeHtml).join(' / ')}</li>`).join('');
  await writeFile(join(output, 'index.html'), shell('Game manuals', `<h1>Game manuals</h1>${status}<ul id="manuals">${list}</ul>`, `${loader}
try {
  const manifest = await latestManifest('manifest.json');
  const list = document.getElementById('manuals');
  list.replaceChildren();
  for (const manual of manifest.manuals) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = manual.id + '/';
    link.textContent = manual.title;
    item.append(link, ' · ' + manual.platform + ' · ' + manual.languages.join(' / '));
    list.append(item);
  }
  document.getElementById('status').textContent = '';
} catch (error) { failed(error); }`));
  await writeFile(join(output, '.nojekyll'), '');
  // Replaces the previous Vite PWA worker at the same URL, without clearing
  // origin-wide caches that may belong to other GitHub Pages projects.
  await writeFile(join(output, 'sw.js'), `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.registration.unregister();
  const windows = await self.clients.matchAll({ type: 'window' });
  await Promise.all(windows.filter(client => client.url.startsWith(self.registration.scope)).map(client => client.navigate(client.url)));
})()));
`);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await buildManuals();
  console.log(`Built ${manifest.manuals.length} manuals in manuals-dist/`);
}
