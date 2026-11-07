export function StoreHeart({ filled }: { filled: boolean }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M12 20.5 4.6 13a5 5 0 0 1 7.1-7.1l.3.4.3-.4a5 5 0 0 1 7.1 7.1Z" />
        </svg>
    );
}
