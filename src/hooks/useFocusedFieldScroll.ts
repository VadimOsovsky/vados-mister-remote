import { useEffect } from 'react';

const FIELDS = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]), textarea, select, [contenteditable="true"]';
const GAP = 12;

function revealField(field: HTMLElement) {
    const ancestors: HTMLElement[] = [];
    for (let parent = field.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        ancestors.push(parent);
    }
    // Only move real scroll containers; scrolling the document or clipped app
    // shell would push fixed headers and sheet controls out of view on iOS.
    for (const scroller of ancestors.toReversed()) {
        if (!/^(auto|scroll)$/.test(getComputedStyle(scroller).overflowY) || scroller.scrollHeight <= scroller.clientHeight) continue;
        const viewport = window.visualViewport;
        let top = viewport?.offsetTop ?? 0;
        let bottom = top + (viewport?.height ?? window.innerHeight);
        for (let parent: HTMLElement | null = scroller; parent && parent !== document.body; parent = parent.parentElement) {
            if (!/^(auto|scroll|hidden|clip)$/.test(getComputedStyle(parent).overflowY)) continue;
            const rect = parent.getBoundingClientRect();
            top = Math.max(top, rect.top + parent.clientTop);
            bottom = Math.min(bottom, rect.top + parent.clientTop + parent.clientHeight);
        }
        const rect = field.getBoundingClientRect();
        // Page footers overlay their scroll containers. Sheet footers already
        // sit outside the scrollable form and are accounted for above.
        for (const footer of document.querySelectorAll<HTMLElement>('.tab-bar, .owned-dock')) {
            const bounds = footer.getBoundingClientRect();
            if (bounds.width && bounds.top > top && bounds.top < bottom && bounds.left < rect.right && bounds.right > rect.left) {
                bottom = bounds.top;
            }
        }
        top += GAP;
        bottom -= GAP;
        if (bottom <= top) continue;
        const delta = rect.top < top ? rect.top - top : rect.bottom > bottom ? rect.bottom - bottom : 0;
        if (delta) scroller.scrollTop += delta;
    }
}

export function useFocusedFieldScroll() {
    useEffect(() => {
        let frame = 0;
        let settled: ReturnType<typeof setTimeout> | undefined;
        const reveal = () => {
            const field = document.activeElement;
            if (field instanceof HTMLElement && field.matches(FIELDS)) revealField(field);
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(reveal);
        };
        const focus = () => {
            schedule();
            clearTimeout(settled);
            // Recheck after sheet and keyboard opening animations settle.
            settled = setTimeout(schedule, 350);
        };
        document.addEventListener('focusin', focus);
        window.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('resize', schedule);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(settled);
            document.removeEventListener('focusin', focus);
            window.removeEventListener('resize', schedule);
            window.visualViewport?.removeEventListener('resize', schedule);
        };
    }, []);
}
