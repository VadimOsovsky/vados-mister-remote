import { CONSOLE_GROUPS } from '../constants';
import type { ConsoleKey } from '../types';

export function consolePrice(key: ConsoleKey, owned: readonly ConsoleKey[]): number | null {
    const group = CONSOLE_GROUPS.find(group => group.consoles.includes(key));
    if (!group || owned.includes(key)) return null;
    return group.consoles.some(console => owned.includes(console)) ? 80 : 160;
}
