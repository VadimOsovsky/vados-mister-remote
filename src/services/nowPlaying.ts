import type { WizzoPlayingResponse } from './wizzoApi';
import type { ConsoleKey } from '../types';
import { PLATFORMS } from '../constants';

export function isRomPlaying(playing: WizzoPlayingResponse | null, romPath: string | null, consoleKey: ConsoleKey): boolean {
    const platform = PLATFORMS[consoleKey];
    if (!playing?.core || !playing.gameName || !romPath || playing.system !== platform.wizzoSystemId) return false;
    // PAL and Dendy share the NES system ID, but launch under distinct setnames.
    const runningVariant = Object.values(PLATFORMS).find(candidate => candidate.mglConfig?.setname === playing.core);
    const expectedCore = platform.mglConfig?.setname;
    if (expectedCore && playing.core !== expectedCore) return false;
    if (runningVariant && runningVariant.mglConfig?.setname !== expectedCore) return false;
    const filename = romPath.replace(/\\/g, '/').split('/').pop()?.replace(/\.[^.]+$/, '');
    // Wizzo reports the ROM filename without its extension, not a LaunchBox title.
    return Boolean(filename && filename === playing.gameName);
}

export function samePlayingGame(a: WizzoPlayingResponse | null, b: WizzoPlayingResponse | null): boolean {
    return a?.core === b?.core && a?.system === b?.system && a?.systemName === b?.systemName
        && a?.game === b?.game && a?.gameName === b?.gameName;
}
