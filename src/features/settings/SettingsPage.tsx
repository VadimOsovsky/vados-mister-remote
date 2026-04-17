import { useAppContext } from '../../AppContext';
import { useSettings } from '../../hooks/useSettings';
import './SettingsPage.css';

export function SettingsPage() {
    const { misterHost, setMisterHost } = useAppContext();
    const {
        settingsLogin, setSettingsLogin,
        settingsPassword, setSettingsPassword,
        settingsHost, setSettingsHost,
        settingsSaved, saveSettings,
    } = useSettings(misterHost, setMisterHost);

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
            <div className="settings-section">
                <div className="settings-section-title">ScreenScraper API</div>
                <label className="settings-field">
                    <span className="settings-label">Developer ID</span>
                    <input
                        className="settings-input"
                        type="text"
                        placeholder="Developer ID"
                        value={settingsLogin}
                        onChange={(e) => setSettingsLogin(e.target.value)}
                        autoComplete="off"
                    />
                </label>
                <label className="settings-field">
                    <span className="settings-label">Developer Password</span>
                    <input
                        className="settings-input"
                        type="password"
                        placeholder="Developer Password"
                        value={settingsPassword}
                        onChange={(e) => setSettingsPassword(e.target.value)}
                        autoComplete="off"
                    />
                </label>
            </div>
            <button className="settings-save" onClick={saveSettings}>
                {settingsSaved ? 'Saved!' : 'Save'}
            </button>
            <div className="settings-hint">
                Credentials are stored locally on this device only.
            </div>
        </div>
    );
}
