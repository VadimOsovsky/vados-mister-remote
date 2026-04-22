import { getWalletBalance, setWalletBalance, getLastTopupDate, setLastTopupDate } from './storage';

const MONTHLY_ALLOWANCE = 100;
const BEATEN_REWARD = 60;

export { BEATEN_REWARD };

export function initWallet(): number {
    const lastTopup = getLastTopupDate();

    if (!lastTopup) {
        // First launch — grant starting balance
        setWalletBalance(MONTHLY_ALLOWANCE);
        setLastTopupDate(new Date().toISOString());
        return MONTHLY_ALLOWANCE;
    }

    const last = new Date(lastTopup);
    const now = new Date();

    // Check if at least one calendar month has passed
    const monthsPassed =
        (now.getFullYear() - last.getFullYear()) * 12 +
        (now.getMonth() - last.getMonth());

    if (monthsPassed >= 1) {
        const current = getWalletBalance();
        const updated = current + MONTHLY_ALLOWANCE;
        setWalletBalance(updated);
        setLastTopupDate(now.toISOString());
        return updated;
    }

    return getWalletBalance();
}
