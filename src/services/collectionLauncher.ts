import { PLATFORMS } from '../constants';
import { getRomMapping } from '../lib/storage';
import { recordGameLaunch } from '../lib/recentGames';
import type { ConsoleKey } from '../types';
import type { WizzoApi } from './wizzoApi';
import { launchGameForPlatform } from './zaparooLauncher';
import { isRomPlaying } from './nowPlaying';

export async function launchCollectionGame(api: WizzoApi, consoleKey: ConsoleKey, gameId: string, romPath: string) {
    await launchGameForPlatform(api.host, PLATFORMS[consoleKey], romPath, api);
    recordGameLaunch(consoleKey, gameId);
}

export async function loadCollectionSave(
    api: WizzoApi, consoleKey: ConsoleKey, gameId: string, slot: number, expectedRom?: string,
) {
    const romPath = expectedRom ?? getRomMapping(gameId, consoleKey);
    if (!romPath) throw new Error('No ROM mapping found, cannot auto-launch');
    const matchesGame = (playing: Awaited<ReturnType<WizzoApi['getPlaying']>>) =>
        isRomPlaying(playing, romPath, consoleKey);

    if (!matchesGame(await api.getPlaying())) {
        await launchCollectionGame(api, consoleKey, gameId, romPath);
        for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (matchesGame(await api.getPlaying())) {
                await api.loadState(slot);
                return;
            }
        }
        throw new Error('Could not confirm the selected game is running');
    }
    await api.loadState(slot);
}
