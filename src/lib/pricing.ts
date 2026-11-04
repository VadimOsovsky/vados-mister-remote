import type { LaunchBoxGame } from '../types';

export function getGamePrice(game: LaunchBoxGame): number {
    if (game.rating === 0 && game.ratingCount === 0) return 25;
    return Math.round(25 + (game.rating / 5) * 30);
}

export function formatGamePrice(price: number): string {
    return price === 0 ? 'FREE' : formatPrice(price);
}

export function formatPrice(price: number): string {
    return '$' + price.toFixed(Number.isInteger(price) ? 0 : 2);
}
