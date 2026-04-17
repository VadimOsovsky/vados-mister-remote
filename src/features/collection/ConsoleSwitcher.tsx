import { PLATFORMS } from '../../constants';
import type { ConsoleKey } from '../../types';
import './ConsoleSwitcher.css';

export function ConsoleSwitcher({ activeConsole, onSwitch }: {
    activeConsole: ConsoleKey;
    onSwitch: (key: ConsoleKey) => void;
}) {
    return (
        <div className="console-switcher">
            {(Object.keys(PLATFORMS) as ConsoleKey[]).map((key) => (
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
