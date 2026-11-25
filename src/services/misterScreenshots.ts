import { samePlayingGame } from './nowPlaying';
import type { WizzoApi, WizzoPlayingResponse } from './wizzoApi';

const capturing = new Set<string>();

export async function captureScreenshot(api: WizzoApi, playing: WizzoPlayingResponse) {
    const device = api.wsUrl;
    if (capturing.has(device)) throw new Error('A screenshot is already being captured. Try again.');
    capturing.add(device);
    try {
        const previous = new Set((await api.listScreenshots(AbortSignal.timeout(5000))).map(image => image.path));
        if (!samePlayingGame(playing, await api.getPlaying(AbortSignal.timeout(5000)))) {
            throw new Error('The running game changed before the screenshot.');
        }
        await api.takeScreenshot(AbortSignal.timeout(5000));
        const romName = playing.romPath?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '');
        for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 1000 : 500));
            const matches = (await api.listScreenshots(AbortSignal.timeout(5000))).filter(image =>
                !previous.has(image.path) && image.core === playing.core
                && (image.game === playing.gameName || image.game === romName));
            if (matches.length === 0) continue;
            if (matches.length === 1 && samePlayingGame(playing, await api.getPlaying(AbortSignal.timeout(5000)))) {
                return matches[0];
            }
            throw new Error('Could not identify the new screenshot for this game.');
        }
        throw new Error('MiSTer did not return a new screenshot. Try again.');
    } finally {
        capturing.delete(device);
    }
}
