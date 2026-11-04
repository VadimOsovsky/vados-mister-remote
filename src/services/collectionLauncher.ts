import { PLATFORMS } from '../constants';
import { getRomMapping } from '../lib/storage';
import { recordGameLaunch } from '../lib/recentGames';
import type { ConsoleKey } from '../types';
import type { WizzoApi } from './wizzoApi';
import { launchGameForPlatform } from './zaparooLauncher';

export async function launchCollectionGame(api: WizzoApi, consoleKey: ConsoleKey, gameId: string, romPath: string) {
    await launchGameForPlatform(api.host, PLATFORMS[consoleKey], romPath, api);
    recordGameLaunch(consoleKey, gameId);
}

export async function loadCollectionSave(
    api: WizzoApi, consoleKey: ConsoleKey, gameId: string, slot: number, expectedRom?: string,
) {
    const matchesGame = (playing: Awaited<ReturnType<WizzoApi['getPlaying']>>) => {
        if (!expectedRom) return Boolean(playing.core);
        const filename = expectedRom.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '');
        return Boolean(playing.core && playing.system === PLATFORMS[consoleKey].wizzoSystemId
            && filename && playing.gameName === filename);
    };

    if (!matchesGame(await api.getPlaying())) {
        const romPath = expectedRom ?? getRomMapping(gameId, consoleKey);
        if (!romPath) throw new Error('No ROM mapping found, cannot auto-launch');
        await launchCollectionGame(api, consoleKey, gameId, romPath);
        for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (matchesGame(await api.getPlaying())) {
                await api.loadState(slot);
                return;
            }
        }
        if (expectedRom) throw new Error('Could not confirm the selected game is running');
    }
    await api.loadState(slot);
}
