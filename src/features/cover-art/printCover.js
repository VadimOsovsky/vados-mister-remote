import editorCss from './CoverArtEditor.css?inline';

const usablePageHeight = 273;
const rowGap = 8;

function composePages(sheet, entries) {
    const doc = sheet.ownerDocument;
    let page;
    let usedHeight = 0;
    for (const { artwork, isNfc } of entries) {
        const height = isNfc ? 54 : 101.6;
        if (!page || usedHeight + rowGap + height > usablePageHeight) {
            page = doc.createElement('div');
            page.className = 'print-page';
            sheet.append(page);
            usedHeight = 0;
        }

        const copy = artwork.cloneNode(true);
        if (isNfc) {
            for (const card of copy.querySelectorAll('.nfc-card')) {
                const slot = doc.createElement('div');
                slot.className = 'print-nfc-side';
                card.replaceWith(slot);
                slot.append(card);
            }
        }
        page.append(copy);
        usedHeight += (usedHeight ? rowGap : 0) + height;
    }
}

export async function printCover(root, entries) {
    const frame = document.createElement('iframe');
    frame.className = 'cover-art-print-frame';
    frame.title = 'Cover art print preview';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    root.append(frame);

    try {
        const printWindow = frame.contentWindow;
        const printDocument = printWindow.document;
        printDocument.title = entries.length === 1 ? entries[0].title : 'Cover Art';
        const base = printDocument.createElement('base');
        base.href = document.baseURI;
        const style = printDocument.createElement('style');
        style.textContent = editorCss;
        printDocument.head.append(base, style);

        const sheet = printDocument.createElement('main');
        sheet.className = 'cover-art-editor cover-art-print';
        sheet.append(root.querySelector('.logo-filters').cloneNode(true));
        composePages(sheet, entries);
        printDocument.body.append(sheet);

        // Resolve the assets used by the snapshot before opening the print dialog.
        const images = [...sheet.querySelectorAll('img[src]')]
            .filter(image => !image.closest('[hidden]'));
        await Promise.allSettled(images.map(image => image.decode()));
        for (const front of sheet.querySelectorAll('.nfc-front')) {
            const image = front.querySelector('.nfc-art img');
            if (image.hidden || !image.naturalHeight) continue;
            const ratio = front.dataset.orientation === 'original'
                ? image.naturalWidth / image.naturalHeight
                : image.naturalHeight / image.naturalWidth;
            front.style.setProperty('--nfc-art-ratio', ratio);
        }
        await printDocument.fonts.ready;
        if (!frame.isConnected) return;

        printWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
        printWindow.print();
    } catch (error) {
        frame.remove();
        throw error;
    }
}
