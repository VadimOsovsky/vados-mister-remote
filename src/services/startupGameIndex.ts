import type { WizzoApi, WizzoWsEvent } from './wizzoApi';

const MENU_IDLE_DELAY = 15_000;

export function createStartupGameIndex(api: Pick<WizzoApi, 'wsUrl' | 'generateIndex'>, handledHosts: Set<string>) {
    const host = api.wsUrl;
    let inMenu = false;
    let gameRunning = false;
    let indexIdle = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function cancel() {
        clearTimeout(timer);
    }

    function onEvent(event: WizzoWsEvent) {
        if (handledHosts.has(host)) return;

        switch (event.type) {
            case 'coreRunning':
                inMenu = event.name === '';
                break;
            case 'gameRunning':
                gameRunning = Boolean(event.name);
                break;
            case 'indexStatus':
                // A rebuild already underway also refreshes the index for this opening.
                if (event.inProgress) handledHosts.add(host);
                indexIdle = !event.inProgress;
                break;
            case 'menuNavigation':
                break;
        }

        cancel();
        if (!inMenu || gameRunning || !indexIdle) return;

        timer = setTimeout(() => {
            if (handledHosts.has(host)) return;
            handledHosts.add(host);
            void api.generateIndex().catch(() => {});
        }, MENU_IDLE_DELAY);
    }

    return { onEvent, cancel };
}
