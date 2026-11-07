---
name: html-game-manual
description: Convert an original video game manual supplied as a PDF, scan, or source URL into a self-contained, localized HTML manual in the MiSTer Remote repository, or refine an existing web manual from its source.
---

# HTML game manual

Read `manuals/AGENTS.md` and `manuals/README.md` from the repository root. Use `manuals/nes/super-mario-bros/index.html` as a reference for navigation and layout. Search or inspect selected parts of the file to avoid loading the embedded image and font data.

## Read the original

- Identify the game, platform and edition from the supplied source. For a scanned PDF, render the pages and inspect the illustrations alongside the text. Use OCR as a starting point and check names, buttons, scores and gameplay conditions against the scan.
- Keep the original's section order and game-specific terminology where practical. Preserve rules and exceptions. Describe condensed or reorganized text as a web adaptation in a short source credit. Keep editorial notes out of the visible manual.
- Use the requested languages. For a new manual in this collection, default to 日本語 / English / Русский when the user gives no other preference. Localize headings, navigation, captions and image descriptions as well as the body. Keep original hardware button labels.

## Lay out the web edition

- Build one responsive scrolling page. Borrow the source edition's typography, palette, frames and illustration treatment. Use full-width cover bands when the composition calls for them and keep text comfortably inset on phones.
- Prefer crops from the original for characters and gameplay diagrams. Check the whole action in each crop, including the enemy, projectile or target the text describes. Preserve useful marks and captions. Redraw a simple diagram or controller only when it improves legibility or the user requests it. Keep hardware labels and remove obsolete leader lines when the accompanying text explains the controls.
- Keep illustrations distinct from the page accents. Preserve the scan's contrast and avoid tinting monochrome artwork through background blending. Optimize embedded images to the size at which they will be displayed. Embed fonts only if their license permits it and include the required notice.
- Build the contents from stable section IDs. Preserve existing anchors on edits. Put the language switcher at the top and keep the selected language in `?lang=` while retaining the section fragment. A compact fixed return link may appear after the contents scrolls out of view. Hide it at the top and on return to the contents.

## Save and verify

- Write the standalone UTF-8 document to `manuals/<platform>/<game>/index.html` and register it in `manuals/catalog.json`. Use the catalog's stable ID and original source URL. Keep CSS, JavaScript, translations and illustration data inside the HTML. Keep PDF downloads and working crops outside `manuals/`.
- Open the HTML directly in a browser. Inspect the cover, diagrams and dense sections on a phone-width viewport and a desktop viewport. Test all languages, contents links, and a direct link with both `?lang=` and a section fragment. Confirm the page loads its assets offline and fits without horizontal scrolling.
- Run `node --test tests/manuals.test.mjs` and `node scripts/build-manuals.mjs` from the repository root. Report the source HTML path and the stable Pages URL when relevant. Use the stable URL for any separately requested app integration. Commit, push or deploy only when requested for that work.
