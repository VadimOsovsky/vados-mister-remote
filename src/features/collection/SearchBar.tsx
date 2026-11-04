import type { SortMode } from '../../types';
import { SearchIcon, SortIcon } from '../../lib/icons';
import './SearchBar.css';

const SORT_LABELS: Record<SortMode, string> = {
    popular: 'Top',
    year: 'Year',
    title: 'A-Z',
    az: 'A-Z',
    za: 'Z-A',
    recent: 'Recent',
    most: 'Most',
};

export function SearchBar({ value, onChange, sort, sortCycle, onSortChange, placeholder = "Search games..." }: {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    sort?: SortMode;
    sortCycle?: SortMode[];
    onSortChange?: (sort: SortMode) => void;
}) {
    const cycle = sortCycle ?? ['az'];
    const currentSort = sort ?? cycle[0];

    const handleSort = () => {
        if (!onSortChange) return;
        const idx = cycle.indexOf(currentSort);
        onSortChange(cycle[(idx + 1) % cycle.length]);
    };

    return (
        <div className="search-bar">
            <div className="search-input-wrap">
                <span className="search-icon">{SearchIcon}</span>
                <input aria-label="Search games"
                    className="search-input"
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
            {onSortChange && <button className="sort-button" onClick={handleSort}>
                {SortIcon}
                <span>{SORT_LABELS[currentSort]}</span>
            </button>}
        </div>
    );
}
