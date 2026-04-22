import { useAppContext } from '../../AppContext';
import { OsdIcon, ResetIcon } from '../../lib/icons';
import { KEYBOARD_KEYS } from '../../services/wizzoApi';
import './RemotePage.css';

export function RemotePage() {
    const { api } = useAppContext();

    const press = (key: string) => {
        navigator.vibrate?.(10);
        api.sendKey(key);
    };

    return (
        <div className="remote-page">
            <div className="remote-header">Remote</div>

            <div className="remote-body">
                <div className="remote-actions">
                    <button className="remote-btn" onClick={() => press(KEYBOARD_KEYS.reset)}>
                        {ResetIcon}
                        <span>Reset</span>
                    </button>
                    <button className="remote-btn" onClick={() => press(KEYBOARD_KEYS.osd)}>
                        {OsdIcon}
                        <span>OSD</span>
                    </button>
                    <button className="remote-btn" onClick={() => press(KEYBOARD_KEYS.back)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                             strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                        <span>Back</span>
                    </button>
                </div>

                <div className="dpad">
                    <div className="dpad-empty"/>
                    <button className="dpad-btn dpad-up" onClick={() => press(KEYBOARD_KEYS.up)}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8l-5 7h10z"/></svg>
                    </button>
                    <div className="dpad-empty"/>

                    <button className="dpad-btn dpad-left" onClick={() => press(KEYBOARD_KEYS.left)}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 12l7-5v10z"/></svg>
                    </button>
                    <button className="dpad-center" onClick={() => press(KEYBOARD_KEYS.confirm)}>
                        OK
                    </button>
                    <button className="dpad-btn dpad-right" onClick={() => press(KEYBOARD_KEYS.right)}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12l-7-5v10z"/></svg>
                    </button>

                    <div className="dpad-empty"/>
                    <button className="dpad-btn dpad-down" onClick={() => press(KEYBOARD_KEYS.down)}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 16l-5-7h10z"/></svg>
                    </button>
                    <div className="dpad-empty"/>
                </div>
            </div>
        </div>
    );
}
