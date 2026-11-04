import type { ConsoleKey } from '../../types';

const nes: Record<string, string> = {
    '135': 'castlevania', '121': 'kirby', '361': 'megaman',
    '123': 'metroid', '112': 'mario3', '113': 'zelda',
};
const japan: Record<string, string> = {
    '135': 'castlevania-jp', '121': 'kirby-jp', '112': 'mario3-jp',
};
const fds: Record<string, string> = {
    '90335': 'castlevania-fds', '90377': 'mario-fds', '91920': 'zelda-fds',
};

export function getPreviewCover(consoleKey: ConsoleKey, gameId: string) {
    const name = consoleKey === 'fds' ? fds[gameId]
        : consoleKey === 'famicom' || consoleKey === 'av_famicom' ? japan[gameId] ?? nes[gameId]
        : nes[gameId];
    return name ? `/playroom/preview/${name}.png` : undefined;
}

export function getPreviewScreenshot(gameId: string) {
    const name = nes[gameId] || ({ '90335': 'castlevania', '91920': 'zelda' } as Record<string, string>)[gameId];
    return name ? `/playroom/preview/${name}-screen.png` : undefined;
}
