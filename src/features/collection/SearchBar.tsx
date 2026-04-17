import { SearchIcon, SortIcon } from '../../lib/icons';
import './SearchBar.css';

export function SearchBar({ value, onChange }: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="search-bar">
            <div className="search-input-wrap">
                <span className="search-icon">{SearchIcon}</span>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search games..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
            <button className="sort-button">
                {SortIcon}
                <span>A-Z</span>
            </button>
        </div>
    );
}
