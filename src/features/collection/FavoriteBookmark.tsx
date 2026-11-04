import './FavoriteBookmark.css';

export function FavoriteStar({ filled = false }: { filled?: boolean }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
        </svg>
    );
}

export function FavoriteBookmark() {
    return <span className="favorite-bookmark" role="img" aria-label="Favorite"><FavoriteStar filled /></span>;
}
