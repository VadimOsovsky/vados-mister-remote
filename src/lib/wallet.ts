import { getWalletBalance, setWalletBalance, getLastTopupDate, setLastTopupDate, getBeatenRewardedMap, addBeatenRewardedId, readEconomyDisabled } from './storage';

import { queueWalletVisit } from './sharedStorage';
import { DAILY_ALLOWANCE, dayKey, normalizeVisitDate, STARTING_BALANCE } from './walletVisit';

export { DAILY_ALLOWANCE, STARTING_BALANCE } from './walletVisit';
export const BEATEN_REWARD = 75;

export function visitWallet(now = new Date()): { balance: number; reward: number } {
    const today = dayKey(now);
    const queued = queueWalletVisit(today);
    if (queued) return queued;
    if (readEconomyDisabled()) return { balance: getWalletBalance(), reward: 0 };
    const lastTopup = getLastTopupDate();
    if (!lastTopup) {
        setWalletBalance(STARTING_BALANCE);
        setLastTopupDate(today);
        return { balance: STARTING_BALANCE, reward: 0 };
    }
    // Migrate monthly timestamps without paying for missed days.
    const lastDay = normalizeVisitDate(lastTopup);
    const balance = getWalletBalance();
    if (today <= lastDay) return { balance, reward: 0 };
    setWalletBalance(balance + DAILY_ALLOWANCE);
    setLastTopupDate(today);
    return { balance: balance + DAILY_ALLOWANCE, reward: DAILY_ALLOWANCE };
}

export function rewardBeatenGame(gameId: string): { balance: number; reward: number } {
    const balance = getWalletBalance();
    if (readEconomyDisabled() || getBeatenRewardedMap()[gameId]) return { balance, reward: 0 };
    addBeatenRewardedId(gameId);
    setWalletBalance(balance + BEATEN_REWARD);
    return { balance: balance + BEATEN_REWARD, reward: BEATEN_REWARD };
}

export function spendWallet(price: number): number | null {
    const balance = getWalletBalance();
    if (readEconomyDisabled()) return balance;
    if (!Number.isFinite(price) || price < 0 || balance < price) return null;
    const remaining = Math.round((balance - price) * 100) / 100;
    setWalletBalance(remaining);
    return remaining;
}
