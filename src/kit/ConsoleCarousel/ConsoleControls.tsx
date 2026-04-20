import type { ReactNode } from 'react';
import { PLATFORMS } from '../../constants';
import { useAppContext } from '../../AppContext';
import { ResetIcon, DiskIcon } from '../../lib/icons';
import type { ConsoleKey } from '../../types';
import './ConsoleControls.css';

const CONTROL_ICONS: Record<string, ReactNode> = {
    reset: ResetIcon,
    flip_disk: DiskIcon,
};

export function ConsoleControls({ activeConsole }: { activeConsole: ConsoleKey }) {
    const { api } = useAppContext();
    const controls = PLATFORMS[activeConsole].controls;

    if (!controls?.length) return null;

    const press = (action: string) => {
        navigator.vibrate?.(10);
        api.sendKey(action);
    };

    return (
        <div className="console-controls">
            {controls.map((ctrl) => (
                <button key={ctrl.id} className="console-ctrl-btn" onClick={() => press(ctrl.action)}>
                    {CONTROL_ICONS[ctrl.id] ?? null}
                    <span>{ctrl.label}</span>
                </button>
            ))}
        </div>
    );
}
