import { PLATFORMS } from '../../constants';
import type { ConsoleKey } from '../../types';
import './ConsoleSwitcher.css';

export function ConsoleSwitcher({ activeConsole, onSwitch, keys }: {
    activeConsole: ConsoleKey;
    onSwitch: (key: ConsoleKey) => void;
    keys?: ConsoleKey[];
}) {
    const items = keys ?? (Object.keys(PLATFORMS) as ConsoleKey[]);
    return (
        <div className="console-switcher">
            {items.map((key) => (
                <button
                    key={key}
                    className={`console-pill ${activeConsole === key ? 'active' : ''}`}
                    onClick={() => onSwitch(key)}
                >
                    <span>{PLATFORMS[key].icon}</span>
                    <span>{PLATFORMS[key].name}</span>
                </button>
            ))}
        </div>
    );
}
