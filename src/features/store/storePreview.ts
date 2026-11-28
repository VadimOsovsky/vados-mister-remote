import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { getGamePrice } from '../../lib/pricing';
import { PLATFORMS } from '../../constants';

const previewIds = {
    nes: ['361', '135', '112', '113', '121', '123'],
    famicom: ['112', '121', '135'],
    fds: ['91920', '90377', '90335'],
    snes: ['136', '41', '299', '1730', '1318'],
    n64: ['216', '266', '161'],
};
const previewPrices = [1, 9.99, 25, 99.99, 125, 9999.99];

export function getStorePreviewIds(consoleKey: ConsoleKey) {
    if (consoleKey === 'famicom' || consoleKey === 'av_famicom') return previewIds.famicom;
    const catalog = PLATFORMS[consoleKey].lbPlatform;
    return previewIds[catalog as keyof typeof previewIds] ?? previewIds.nes;
}

export function storePrice(game: LaunchBoxGame, consoleKey: ConsoleKey, preview: boolean, economyDisabled: boolean) {
    if (economyDisabled) return 0;
    const index = preview ? getStorePreviewIds(consoleKey).indexOf(game.id) : -1;
    return previewPrices[index] ?? getGamePrice(game);
}

