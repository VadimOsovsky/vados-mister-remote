import type { ReactNode } from 'react';
import { PLATFORMS } from '../../constants';
import { useAppContext } from '../../AppContext';
import { ResetIcon, DiskIcon, PowerIcon } from '../../lib/icons';
import type { ConsoleKey, ConsoleControl } from '../../types';
import './ConsoleControls.css';

const CONTROL_ICONS: Record<string, ReactNode> = {
    launch_core: PowerIcon,
    reset: ResetIcon,
    flip_disk: DiskIcon,
};

export function ConsoleControls({ activeConsole }: { activeConsole: ConsoleKey }) {
    const { api } = useAppContext();
    const platform = PLATFORMS[activeConsole];
    const controls = platform.controls;

    if (!controls?.length) return null;

    const press = (ctrl: ConsoleControl) => {
        navigator.vibrate?.(10);
        if (ctrl.type === 'launch') {
            if (platform.launchPath) {
                api.launchGame(platform.launchPath);
            } else {
                api.launchSystem(platform.wizzoSystemId);
            }
        } else if (ctrl.id === 'flip_disk') {
            api.flipDisk();
        } else {
            api.sendKey(ctrl.action);
        }
    };

    return (
        <div className="console-controls">
            {controls.map((ctrl) => (
                <button key={ctrl.id} className="console-ctrl-btn" onClick={() => press(ctrl)}>
                    {CONTROL_ICONS[ctrl.id] ?? null}
                    <span>{ctrl.label}</span>
                </button>
            ))}
        </div>
    );
}
