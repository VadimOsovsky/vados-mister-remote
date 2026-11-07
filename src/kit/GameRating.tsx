import type { LaunchBoxGame } from '../types';

export function GameRating({ rating, ratingCount }: Pick<LaunchBoxGame, 'rating' | 'ratingCount'>) {
    if (!(ratingCount > 0)) return null;

    return (
        <div>
            <dt>LaunchBox rating</dt>
            <dd><span aria-hidden="true">★</span> {rating.toFixed(1)}/5 ({ratingCount.toLocaleString('en-US')} {ratingCount === 1 ? 'vote' : 'votes'})</dd>
        </div>
    );
}
