export function viewportLayout(layoutHeight: number, visibleHeight: number, offsetTop: number, editing: boolean, standalone = false) {
    // Standalone iOS can report a shorter visual viewport even without a
    // keyboard. Do not shrink the whole app for that safe-area discrepancy.
    const keyboardOpen = editing && layoutHeight - visibleHeight > 100;
    return {
        height: keyboardOpen ? `${visibleHeight}px` : standalone ? '100vh' : '100dvh',
        top: keyboardOpen ? `${offsetTop}px` : '0px',
        bottom: keyboardOpen ? `${Math.max(0, layoutHeight - visibleHeight - offsetTop)}px` : '0px',
        safeBottom: keyboardOpen ? '0px' : 'env(safe-area-inset-bottom)',
    };
}
