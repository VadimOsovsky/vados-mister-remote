import './BrandingBar.css';

export function BrandingBar({ text }: { text: string }) {
    return (
        <div className="branding-bar">
            <div className="branding-line" />
            <span className="branding-text">{text}</span>
            <div className="branding-line" />
        </div>
    );
}
