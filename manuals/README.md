# Web manuals

This repository contains two independently deployed parts:

- The React application lives in the repository root (`src/`, `public/`) and is deployed to MiSTer with the existing scripts.
- `manuals/` contains standalone game manuals published to GitHub Pages. It is deliberately outside `public/`, so Vite and the MiSTer deployment do not include it.

## Add or update a manual

1. Save a complete, UTF-8 HTML document at `<platform>/<game>/index.html`. Use lowercase ASCII slugs, for example `nes/super-mario-bros`.
2. Embed all images as data URLs, and include CSS, scripts and translations in that same HTML file. No external runtime dependencies or service workers. A source PDF link is fine.
3. Add an entry to `catalog.json`: `id`, `title`, `platform`, `languages` and `sourceUrl`. `id` is the relative directory path; the source URL is the original manual, not the generated web page.
4. Run `npm run test:manuals` and `npm run build:manuals` from the repository root. Neither command needs app dependencies; the underlying scripts use only Node.js built-ins (Node 22+).
5. Commit the source HTML and catalog. Push to `main` to publish. Do not commit `manuals-dist/`, PDFs, crop intermediates or generated revision files.

The Mario manual is an unofficial web adaptation with condensed, reorganized text rather than a verbatim transcription. Its embedded font license is retained inside the HTML.

## Manual navigation

The Mario manual has seven semantic sections, `m-section-0` through `m-section-6`, each labelled by its heading. The contents links target those IDs. Preserve these published anchors when revising the layout. `#contents` returns to the table of contents.

Language can be selected with `?lang=ja`, `?lang=en` or `?lang=ru`; the buttons update the URL. A link such as `nes/super-mario-bros/?lang=en#m-section-1` opens the English controls section. The stable launcher preserves both query parameters and the section anchor when resolving the current revision.

## Publishing

`.github/workflows/deploy-manuals.yml` validates pull requests and publishes changes to manuals, their builder, tests or the workflow on `main`. It can also be run manually. Only `manuals-dist/` is uploaded; the application is never built or published by this workflow.

One-time repository setting: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Remove an obsolete custom domain there if it should no longer be used. No personal access token or S3 credentials are needed; the deploy job uses the scoped `GITHUB_TOKEN` and OIDC.

Default catalog URL:

`https://vadimosovsky.github.io/vados-mister-remote/`

Stable manual URL (use this in the application later):

`https://vadimosovsky.github.io/vados-mister-remote/nes/super-mario-bros/`

Always include the trailing slash. The app does not reference these URLs yet.

## Updates and caching

GitHub Pages controls HTTP response headers; adding `Cache-Control` meta tags or a `_headers` file does not provide a reliable cache policy here. We handle freshness through URLs:

- A stable manual URL serves a small launcher. On **each open**, it requests `manifest.json` with `cache: 'no-store'` and a unique query parameter to avoid reusing a browser/CDN response.
- The manifest points to `manual.<sha256-prefix>.html`. A content edit creates a different filename; unchanged content retains its filename. The HTML still contains all its assets and translations.
- The catalog also resolves the latest manifest at runtime, so a cached catalog shell can discover new entries.
- No new manual service worker or offline cache is installed. `sw.js` retires the former Vite PWA worker at the same URL when the browser checks it for updates, unregistering it and reloading its controlled tabs. It does not clear unrelated origin-wide caches.

Publishing is not instantaneous: allow the Actions deployment and Pages propagation to finish. A tab already showing a manual remains on that revision until you reopen the **stable** URL. A bookmarked hash URL intentionally identifies a specific revision and is not a latest-version URL. CI publishes only current revisions, so old hash URLs can disappear after an update; they are not archival permalinks. The first visit after replacing the old PWA may need a refresh while its former worker retires. This is not an absolute instant-update guarantee across all proxies/offline clients.

For future programmatic integration, fetch `manifest.json` with the same cache-busting policy, or use stable launcher URLs. Do not put the manifest or manuals into the app's service-worker precache.

## Local preview

After building, serve `manuals-dist/` with any static HTTP server, for example `python -m http.server 8080 --directory manuals-dist`. Launchers require HTTP because they read the manifest. The source `manuals/<platform>/<game>/index.html` remains a standalone file and opens directly without a server.
