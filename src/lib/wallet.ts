import { getWalletBalance, setWalletBalance, getLastTopupDate, setLastTopupDate, getBeatenRewardedMap, addBeatenRewardedId, readEconomyDisabled } from './storage';

export const STARTING_BALANCE = 85;
export const DAILY_ALLOWANCE = 3;
export const BEATEN_REWARD = 60;

function dayKey(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function visitWallet(now = new Date()): { balance: number; reward: number } {
    if (readEconomyDisabled()) return { balance: getWalletBalance(), reward: 0 };
    const lastTopup = getLastTopupDate();
    const today = dayKey(now);
    if (!lastTopup) {
        setWalletBalance(STARTING_BALANCE);
        setLastTopupDate(today);
        return { balance: STARTING_BALANCE, reward: 0 };
    }
    // Migrate monthly timestamps without paying for missed days.
    const lastDay = /^\d{4}-\d{2}-\d{2}$/.test(lastTopup) ? lastTopup : dayKey(new Date(lastTopup));
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
    setWalletBalance(balance - price);
    return balance - price;
}
