import type { GameArtwork, GameOverrides } from '../types';

export const ARTWORK_KEYS = ['boxFrontUrl', 'boxBackUrl', 'cartridgeUrl', 'manualPhotoUrl', 'manualUrl'] as const;

/** Missing translated materials always fall back to the original, field by field. */
export function resolveGameArtwork(overrides: GameOverrides, language = 'original'): GameArtwork {
    const localized = language === 'original' ? undefined : overrides.artworkByLanguage?.[language];
    return Object.fromEntries(ARTWORK_KEYS.map(key => [key, localized?.[key]?.trim() || overrides[key]]));
}

/** Keep only explicit edits, without losing other language sets when editing one. */
export function cleanGameOverrides(draft: GameOverrides, defaults: GameOverrides = {}): GameOverrides {
    const cleaned: GameOverrides = {};
    for (const key of ['title', 'romName', 'webManualUrl', ...ARTWORK_KEYS] as const) {
        const value = draft[key]?.trim();
        if (value && value !== defaults[key]) cleaned[key] = value;
    }
    const localized: Record<string, GameArtwork> = {};
    for (const [language, artwork] of Object.entries(draft.artworkByLanguage ?? {})) {
        const set: GameArtwork = {};
        for (const key of ARTWORK_KEYS) {
            const value = artwork[key]?.trim();
            if (value) set[key] = value;
        }
        if (Object.keys(set).length) localized[language] = set;
    }
    if (Object.keys(localized).length) cleaned.artworkByLanguage = localized;
    return cleaned;
}
