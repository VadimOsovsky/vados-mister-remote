import { useEffect } from 'react';
import { viewportLayout } from '../lib/viewportLayout';

export function useVisualViewport() {
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const style = document.documentElement.style;
        const standaloneMode = window.matchMedia('(display-mode: standalone)');
        const update = () => {
            const field = document.activeElement;
            const editing = field instanceof HTMLElement && field.matches('input, textarea, [contenteditable="true"]');
            const standalone = standaloneMode.matches || ('standalone' in navigator && navigator.standalone === true);
            const layout = viewportLayout(window.innerHeight, viewport.height, viewport.offsetTop, editing, standalone);
            style.setProperty('--app-viewport-height', layout.height);
            style.setProperty('--app-viewport-top', layout.top);
            style.setProperty('--app-viewport-bottom', layout.bottom);
            style.setProperty('--app-safe-area-bottom', layout.safeBottom);
        };
        update();
        viewport.addEventListener('resize', update);
        viewport.addEventListener('scroll', update);
        window.addEventListener('resize', update);
        window.addEventListener('pageshow', update);
        standaloneMode.addEventListener('change', update);
        document.addEventListener('focusin', update);
        document.addEventListener('focusout', update);
        return () => {
            viewport.removeEventListener('resize', update);
            viewport.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
            window.removeEventListener('pageshow', update);
            standaloneMode.removeEventListener('change', update);
            document.removeEventListener('focusin', update);
            document.removeEventListener('focusout', update);
            for (const name of ['--app-viewport-height', '--app-viewport-top', '--app-viewport-bottom', '--app-safe-area-bottom']) {
                style.removeProperty(name);
            }
        };
    }, []);
}
