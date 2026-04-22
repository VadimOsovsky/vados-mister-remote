import { useCallback, useRef, useState } from 'react';
import { useAppContext } from '../../AppContext';
import { useSettings } from '../../hooks/useSettings';
import './SettingsPage.css';

export function SettingsPage() {
    const { api, misterHost, setMisterHost } = useAppContext();
    const {
        settingsHost, setSettingsHost,
        settingsSaved, saveSettings,
    } = useSettings(misterHost, setMisterHost);

    const [indexStatus, setIndexStatus] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const reindex = useCallback(() => {
        setIndexStatus('Starting...');

        // Listen for progress via WebSocket
        wsRef.current?.close();
        const ws = api.connectWebSocket((event) => {
            if (event.type !== 'indexStatus') return;
            if (event.inProgress) {
                setIndexStatus(event.description || `${event.currentStep}/${event.totalSteps}`);
            } else {
                setIndexStatus('Done!');
                ws.close();
                wsRef.current = null;
                setTimeout(() => setIndexStatus(null), 2000);
            }
        });
        wsRef.current = ws;

        // Fire the reindex request
        api.generateIndex().catch(() => {
            setIndexStatus('Error');
            ws.close();
            wsRef.current = null;
            setTimeout(() => setIndexStatus(null), 2000);
        });
    }, [api]);

    return (
        <div className="settings-panel">
            <div className="settings-header">Settings</div>
            <div className="settings-section">
                <div className="settings-section-title">Connection</div>
                <label className="settings-field">
                    <span className="settings-label">MiSTer IP</span>
                    <input
                        className="settings-input"
                        type="text"
                        placeholder="192.168.0.111"
                        value={settingsHost}
                        onChange={(e) => setSettingsHost(e.target.value)}
                        autoComplete="off"
                    />
                </label>
            </div>
            <button className="settings-save" onClick={saveSettings}>
                {settingsSaved ? 'Saved!' : 'Save'}
            </button>

            <div className="settings-section" style={{ marginTop: 24 }}>
                <div className="settings-section-title">Game Search</div>
                <button className="settings-save" onClick={reindex} disabled={!!indexStatus}>
                    {indexStatus ?? 'Reindex Games'}
                </button>
                <div className="settings-hint" style={{ marginTop: 8 }}>
                    Rebuild the game search index on MiSTer. Use after adding or removing ROMs.
                </div>
            </div>

            <div className="settings-hint">
                Settings are stored locally on this device only.
            </div>
        </div>
    );
}
