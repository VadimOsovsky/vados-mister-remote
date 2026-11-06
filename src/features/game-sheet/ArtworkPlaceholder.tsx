import type { GameArtwork } from '../../types';

type ArtworkKind = Exclude<keyof GameArtwork, 'manualUrl'>;

/** Flat, dashed material silhouettes matching the Library's empty cards. */
export function ArtworkPlaceholder({ kind, disk = false }: { kind: ArtworkKind; disk?: boolean }) {
    const plus = <path d="M20 28h8m-4-4v8" />;
    return <svg className="artwork-placeholder" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {kind === 'boxFrontUrl' && <>
            <rect x="11" y="5" width="26" height="38" rx="1" strokeDasharray="2.5 2.5" />
            <g opacity=".55"><rect x="17" y="11" width="14" height="9" rx="1" /><path d="m17 18 4-4 4 4 3-2 3 3" /></g>
            {plus}
        </>}
        {kind === 'boxBackUrl' && <>
            <rect x="11" y="5" width="26" height="38" rx="1" strokeDasharray="2.5 2.5" />
            <path d="M17 11h14M17 15h14M17 19h9" opacity=".55" />
            {plus}
        </>}
        {kind === 'cartridgeUrl' && (disk ? <>
            <path d="M8 7h27l5 5v29H8Z" strokeDasharray="2.5 2.5" />
            <path d="M15 7v12h17V7M21 7v8h6V7" opacity=".55" />
            {plus}
        </> : <>
            <path d="M12 8h24v5h4v28H8V13h4Z" strokeDasharray="2.5 2.5" />
            <path d="M16 8v12h16V8M15 41v-5h18v5" opacity=".55" />
            {plus}
        </>)}
        {kind === 'manualPhotoUrl' && <>
            <rect x="9" y="6" width="30" height="36" rx="1" strokeDasharray="2.5 2.5" />
            <path d="M14 6v36M20 12h13M20 16h9" opacity=".55" />
            <path d="M23 28h8m-4-4v8" />
        </>}
    </svg>;
}
