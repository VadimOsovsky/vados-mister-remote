import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { useSettings } from '../../hooks/useSettings';
import { PlayroomConsoleHeader } from '../../kit/PlayroomConsoleHeader';
import { OsdIcon, ResetIcon, SearchIcon, StoreIcon } from '../../lib/icons';
import './SettingsPage.css';

type IndexStatus = { label: string; percent?: number; busy: boolean };

export function SettingsPage() {
    const { api, misterHost, setMisterHost, freeGames, setFreeGames } = useAppContext();
    const { settingsHost, setSettingsHost, settingsSaved, saveSettings } = useSettings(misterHost, setMisterHost);
    const [indexStatus, setIndexStatus] = useState<IndexStatus>();
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => () => {
        const socket = wsRef.current;
        wsRef.current = null;
        socket?.close();
    }, []);

    function reindex() {
        setIndexStatus({ label: 'Starting…', busy: true });
        const socket = api.connectWebSocket(event => {
            if (wsRef.current !== socket || event.type !== 'indexStatus') return;
            if (event.inProgress) {
                setIndexStatus({
                    label: event.description || 'Indexing game files…',
                    percent: event.totalSteps > 0 ? Math.min(100, Math.max(0, Math.round(event.currentStep / event.totalSteps * 100))) : undefined,
                    busy: true,
                });
            } else {
                finish({ label: 'Index ready', percent: 100, busy: false });
            }
        });
        wsRef.current = socket;

        function finish(status: IndexStatus) {
            if (wsRef.current !== socket) return;
            wsRef.current = null;
            socket.close();
            setIndexStatus(status);
        }

        socket.addEventListener('close', () => finish({ label: 'Connection lost. Try again.', busy: false }));
        api.generateIndex().catch(() => finish({ label: 'Could not rebuild the index.', busy: false }));
    }

    return (
        <div className="page-layout settings-page">
            <PlayroomConsoleHeader />
            <main className="page-scroll">
                <div className="settings-main">
                    <div className="settings-intro">
                        <p className="playroom-kicker">Make yourself at home</p>
                        <h1>Settings<span>.</span></h1>
                    </div>
                    <section className="settings-card" aria-labelledby="connection-title">
                        <div className="settings-card-heading">
                            <span className="settings-symbol">{OsdIcon}</span>
                            <div><p className="playroom-kicker">01 · Your device</p><h2 id="connection-title">Connection</h2></div>
                        </div>
                        <p>Connect to your MiSTer on the same network.</p>
                        <form onSubmit={event => { event.preventDefault(); saveSettings(); }}>
                            <label htmlFor="mister-host">MiSTer IP address</label>
                            <input id="mister-host" value={settingsHost} onChange={event => setSettingsHost(event.target.value)}
                                placeholder="192.168.0.111" autoComplete="off" spellCheck={false} required />
                            <button className="playroom-button playroom-primary playroom-press" type="submit">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                                {settingsSaved ? 'Saved!' : 'Save connection'}
                            </button>
                        </form>
                    </section>
                    <section className="settings-card" aria-labelledby="index-title">
                        <div className="settings-card-heading">
                            <span className="settings-symbol">{SearchIcon}</span>
                            <div><p className="playroom-kicker">02 · Your game files</p><h2 id="index-title">Game search</h2></div>
                        </div>
                        <p>Added or removed ROMs? Rebuild the search index to keep your game files up to date.</p>
                        <button className="playroom-button playroom-press" onClick={reindex} disabled={indexStatus?.busy}>
                            {ResetIcon} Reindex games
                        </button>
                        {indexStatus && <div className="index-progress" role="status">
                            <div><span>{indexStatus.label}</span>{indexStatus.percent !== undefined && <strong>{indexStatus.percent}%</strong>}</div>
                            {(indexStatus.busy || indexStatus.percent === 100) &&
                                <progress value={indexStatus.percent} max={100} aria-label="Indexing progress" />}
                        </div>}
                    </section>
                    <section className="settings-card" aria-labelledby="store-title">
                        <div className="settings-card-heading">
                            <span className="settings-symbol">{StoreIcon}</span>
                            <div><p className="playroom-kicker">03 · Your collection</p><h2 id="store-title">Game store</h2></div>
                        </div>
                        <p id="free-games-description">Add games from the store without spending your balance.</p>
                        <button type="button" role="switch" aria-checked={freeGames} aria-describedby="free-games-description"
                            className="playroom-button playroom-press settings-switch" onClick={() => setFreeGames(!freeGames)}>
                            Free games <span className="settings-switch-track" aria-hidden="true" />
                        </button>
                    </section>
                    <p className="settings-local">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="6" y="3" width="12" height="18" rx="3" /><path d="M10 17h4" />
                        </svg>
                        Settings are saved on this device only.
                    </p>
                </div>
            </main>
        </div>
    );
}
