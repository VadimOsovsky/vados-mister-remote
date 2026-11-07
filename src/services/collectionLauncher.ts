import { PLATFORMS } from '../constants';
import { getRomMapping } from '../lib/storage';
import { recordGameLaunch } from '../lib/recentGames';
import type { ConsoleKey } from '../types';
import type { WizzoApi } from './wizzoApi';
import { launchGameForPlatform } from './zaparooLauncher';
import { isRomPlaying } from './nowPlaying';
import { applyLaunchCheats, CheatLaunchError, fetchCheats, NES_CHEAT_LIMIT, readCheatSelection } from './gameCheats';

export async function launchCollectionGame(api: WizzoApi, consoleKey: ConsoleKey, gameId: string, romPath: string) {
    const names = readCheatSelection(consoleKey, romPath);
    let previousRevision = '';
    if (names.length) {
        try {
            if (api.host !== window.location.hostname) throw new Error('Open Playroom on the MiSTer you want to use cheats on.');
            const catalog = await fetchCheats(romPath);
            previousRevision = catalog.revision;
            if (!catalog.supported) throw new Error('Start MiSTer with Zaparoo Main or clear your selection in Cheats.');
            const selected = catalog.entries.filter(entry => names.includes(entry.id));
            if (selected.length !== names.length) throw new Error('The cheat archive changed. Clear your selection in Cheats.');
            if (selected.reduce((total, entry) => total + entry.codes, 0) > NES_CHEAT_LIMIT) {
                throw new Error('Select up to 32 NES codes in Cheats.');
            }
        } catch (error) {
            throw new CheatLaunchError(error instanceof Error ? error.message : 'Could not prepare cheats.');
        }
    }
    await launchGameForPlatform(api.host, PLATFORMS[consoleKey], romPath, api);
    recordGameLaunch(consoleKey, gameId);
    if (names.length) {
        try {
            await applyLaunchCheats(romPath, names, previousRevision);
        } catch (error) {
            throw new CheatLaunchError(`Game launched. ${error instanceof Error ? error.message : 'Could not apply cheats.'}`);
        }
    }
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
