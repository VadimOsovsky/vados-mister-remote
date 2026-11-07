# Manual authoring contract

This directory is an independent content project, published to GitHub Pages; it is not an application asset directory. Read `README.md` here before changing publishing behavior.

- Each manual is a complete, self-contained UTF-8 HTML document at `<platform>/<game>/index.html` with a responsive web-page layout, embedded original illustrations, inline CSS/JS and language switching. Do not imitate paper pagination unless requested.
- Keep source text and translations separate from illustration pixels. Identify draft translations or shortened adaptations accurately; do not label them complete faithful transcriptions.
- Register each document in `catalog.json` and retain its original source URL. Use stable ASCII IDs (`nes/super-mario-bros`); do not rename existing IDs without handling their published URLs.
- Keep PDFs, processing scripts, extracted images and temporary renders outside the published source tree. Commit only the finished HTML and catalog metadata.
- Do not edit app code or put manuals in `public/` for a manual-only task.
- Do not hardcode generated content hashes or add a service worker. The builder owns revision filenames and latest-version resolution.
- Run `node --test tests/manuals.test.mjs` and `node scripts/build-manuals.mjs` from the repository root. Visually inspect the manual and test all language buttons before delivery.

For the source-to-HTML workflow, see [html-game-manual](../skills/html-game-manual/SKILL.md).
