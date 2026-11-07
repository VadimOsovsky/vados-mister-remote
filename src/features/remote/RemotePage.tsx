import { useMisterState } from '../../state/misterState';
import { ChevronDownIcon, OsdIcon, ResetIcon } from '../../lib/icons';
import { PlayroomConsoleHeader } from '../../kit/PlayroomConsoleHeader';
import { KEYBOARD_KEYS } from '../../services/wizzoApi';
import './RemotePage.css';

const directions = ['up', 'left', 'right', 'down'] as const;

export function RemotePage() {
    const api = useMisterState(state => state.api);

    function press(key: keyof typeof KEYBOARD_KEYS) {
        navigator.vibrate?.(10);
        api.sendKey(KEYBOARD_KEYS[key]);
    }

    return (
        <div className="page-layout remote-page">
            <PlayroomConsoleHeader />
            <main className="page-scroll">
                <div className="remote-main">
                    <div className="remote-intro">
                        <p className="playroom-kicker">Your MiSTer, within reach</p>
                        <h1>Remote control<span>.</span></h1>
                    </div>
                    <section className="remote-deck" aria-label="MiSTer remote">
                        <p className="playroom-kicker remote-deck-top">MiSTer remote</p>
                        <div className="remote-menu-actions">
                            <button className="playroom-button playroom-press" onClick={() => press('osd')}>{OsdIcon} OSD menu</button>
                            <button className="playroom-button playroom-press" onClick={() => press('back')}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h12a6 6 0 0 1 6 6" /></svg> Back
                            </button>
                        </div>
                        <div className="remote-pad" role="group" aria-label="Menu navigation">
                            {directions.map(direction => (
                                <button key={direction} className={`playroom-button playroom-press remote-${direction}`}
                                    aria-label={direction[0].toUpperCase() + direction.slice(1)} onClick={() => press(direction)}>
                                    {ChevronDownIcon}
                                </button>
                            ))}
                            <button className="playroom-button playroom-primary playroom-press remote-ok" onClick={() => press('confirm')}>OK</button>
                        </div>
                        <div className="remote-reset-row">
                            <span>Reset the entire MiSTer</span>
                            <button className="playroom-button playroom-press" onClick={() => press('reset')}>{ResetIcon} Reset MiSTer</button>
                        </div>
                    </section>
                    <p className="remote-hint">Control MiSTer menus with the directional pad.</p>
                </div>
            </main>
        </div>
    );
}
