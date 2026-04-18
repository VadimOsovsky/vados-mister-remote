import type { LaunchBoxGame, SortMode } from '../types';

type SortFn = (a: LaunchBoxGame, b: LaunchBoxGame) => number;

// Bayesian average: (v*R + m*C) / (v + m)
// m = minimum votes to be considered, C = global average rating
const MIN_VOTES = 20;
const AVG_RATING = 3.5;
function bayesian(g: LaunchBoxGame): number {
    return (g.ratingCount * g.rating + MIN_VOTES * AVG_RATING) / (g.ratingCount + MIN_VOTES);
}

export const SORT_FNS: Record<SortMode, SortFn> = {
    popular: (a, b) => bayesian(b) - bayesian(a),
    year:    (a, b) => (a.year || '9999').localeCompare(b.year || '9999'),
    title:   (a, b) => a.title.localeCompare(b.title),
    az:      (a, b) => a.title.localeCompare(b.title),
    za:      (a, b) => b.title.localeCompare(a.title),
    recent:  (a, b) => (b.year || '0').localeCompare(a.year || '0'),
    most:    (a, b) => b.ratingCount - a.ratingCount || b.rating - a.rating,
};
