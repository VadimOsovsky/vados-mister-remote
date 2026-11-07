import { PLATFORMS } from '../../constants';
import type { ConsoleKey } from '../../types';

export function getCollectionPreviewIds(consoleKey: ConsoleKey) {
    return PLATFORMS[consoleKey].lbPlatform === 'fds'
        ? ['90335', '90377', '91920']
        : ['135', '121', '361', '123', '112', '113'];
}
