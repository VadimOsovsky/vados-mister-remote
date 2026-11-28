import { CONSOLE_GROUPS } from '../constants';
import type { ConsoleKey } from '../types';
import { getResalePrice } from './pricing';

export const CONSOLE_PRICE = 160;
export const CONSOLE_RESALE_PRICE = getResalePrice(CONSOLE_PRICE);

export function consolePrice(key: ConsoleKey, owned: readonly ConsoleKey[]): number | null {
    if (owned.includes(key) || !CONSOLE_GROUPS.some(group => group.consoles.includes(key))) return null;
    return CONSOLE_PRICE;
}
