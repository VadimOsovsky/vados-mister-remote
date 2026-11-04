import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { getGamePrice } from '../../lib/pricing';

const previewIds = {
    nes: ['361', '135', '112', '113', '121', '123'],
    famicom: ['112', '121', '135'],
    fds: ['91920', '90377', '90335'],
};
const previewPrices = [1, 9.99, 25, 99.99, 125, 9999.99];

export function getStorePreviewIds(consoleKey: ConsoleKey) {
    if (consoleKey === 'fds') return previewIds.fds;
    if (consoleKey === 'famicom' || consoleKey === 'av_famicom') return previewIds.famicom;
    return previewIds.nes;
}

export function storePrice(game: LaunchBoxGame, consoleKey: ConsoleKey, preview: boolean, freeGames: boolean) {
    if (freeGames) return 0;
    const index = preview ? getStorePreviewIds(consoleKey).indexOf(game.id) : -1;
    return previewPrices[index] ?? getGamePrice(game);
}

