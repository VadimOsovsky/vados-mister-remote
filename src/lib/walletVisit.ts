export const STARTING_BALANCE = 85;
export const DAILY_ALLOWANCE = 5;

export function dayKey(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function normalizeVisitDate(date: string): string {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayKey(new Date(date));
}
