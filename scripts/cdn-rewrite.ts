import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/VadimOsovsky/vados-mister-remote@gh-pages';
const INDEX_PATH = resolve(__dirname, '../dist/index.html');

let html = readFileSync(INDEX_PATH, 'utf-8');

// Rewrite only /assets/ references — keeps registerSW.js, manifest, favicon, PWA icons local
html = html.replace(
  /((?:href|src)=")\/assets\//g,
  `$1${CDN_BASE}/assets/`,
);

writeFileSync(INDEX_PATH, html, 'utf-8');

const count = (html.match(/cdn\.jsdelivr\.net/g) || []).length;
console.log(`cdn-rewrite: Rewrote ${count} asset reference(s) to jsDelivr CDN`);
