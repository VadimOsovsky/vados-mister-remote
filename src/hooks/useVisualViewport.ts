import { useEffect } from 'react';

export function useVisualViewport() {
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const style = document.documentElement.style;
        const update = () => {
            // iOS resizes the visual viewport for the keyboard, but keeps vh/dvh
            // and the layout viewport at their original size.
            const bottom = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
            style.setProperty('--app-viewport-height', `${viewport.height}px`);
            style.setProperty('--app-viewport-top', `${viewport.offsetTop}px`);
            style.setProperty('--app-viewport-bottom', `${bottom}px`);
            style.setProperty('--app-safe-area-bottom', bottom > 100 ? '0px' : 'env(safe-area-inset-bottom)');
        };
        update();
        viewport.addEventListener('resize', update);
        viewport.addEventListener('scroll', update);
        window.addEventListener('resize', update);
        return () => {
            viewport.removeEventListener('resize', update);
            viewport.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
            for (const name of ['--app-viewport-height', '--app-viewport-top', '--app-viewport-bottom', '--app-safe-area-bottom']) {
                style.removeProperty(name);
            }
        };
    }, []);
}
