import type { GameArtwork, GameOverrides } from '../types';
import { coverImageUrl } from '../services/coverUploads';

export const COVER_KEYS = {
    boxFrontUrl: 'boxFrontPreviewUrl',
    boxBackUrl: 'boxBackPreviewUrl',
} as const;

export type CoverKey = keyof typeof COVER_KEYS;

export const ARTWORK_KEYS = ['boxFrontUrl', 'boxFrontPreviewUrl', 'boxBackUrl', 'boxBackPreviewUrl', 'cartridgeUrl', 'manualPhotoUrl', 'manualUrl'] as const;

export function getCoverSources(overrides: GameOverrides, language: string, cover: CoverKey,
    version: 'preview' | 'full', defaults: (string | undefined)[] = []): string[] {
    const preview = COVER_KEYS[cover];
    const keys = version === 'preview' ? [preview, cover] : [cover, preview];
    const localized = language === 'original' ? undefined : overrides.artworkByLanguage?.[language];
    const sources = [...keys.map(key => localized?.[key]), ...keys.map(key => overrides[key]), ...defaults];
    return [...new Set(sources.flatMap(value => value?.trim() ? [coverImageUrl(value.trim())] : []))];
}

/** Missing translated materials always fall back to the original, field by field. */
export function resolveGameArtwork(overrides: GameOverrides, language = 'original'): GameArtwork {
    const localized = language === 'original' ? undefined : overrides.artworkByLanguage?.[language];
    return Object.fromEntries(ARTWORK_KEYS.flatMap(key => {
        const value = localized?.[key]?.trim() || overrides[key];
        return value === undefined && (key === 'boxFrontPreviewUrl' || key === 'boxBackPreviewUrl') ? [] : [[key, value]];
    }));
}

export function resolveGameManualUrl(overrides: GameOverrides, language = 'original'): string | undefined {
    const original = overrides.manualUrl?.trim();
    const web = overrides.webManualUrl?.trim();
    if (language === 'original') return original || web || undefined;

    const translated = overrides.artworkByLanguage?.[language]?.manualUrl?.trim();
    return translated || web || original || undefined;
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
