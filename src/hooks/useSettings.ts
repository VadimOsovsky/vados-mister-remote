import { useCallback, useState } from 'react';
import { writeHost } from '../lib/storage';

export function useSettings(misterHost: string, setMisterHost: (host: string) => void) {
    const [settingsHost, setSettingsHost] = useState(misterHost);
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [settingsError, setSettingsError] = useState('');

    const saveSettings = useCallback(() => {
        const host = settingsHost.trim();
        try {
            const address = new URL(host.includes('://') ? host : `http://${host}`);
            if (!host || (host.includes('://') && address.protocol !== 'https:') ||
                address.username || address.password || address.pathname !== '/' || address.search || address.hash ||
                (address.protocol === 'http:' && host.toLowerCase() !== address.hostname)) throw new Error();
        } catch {
            setSettingsSaved(false);
            setSettingsError('Enter a MiSTer IP address or an HTTPS proxy URL without a path.');
            return;
        }
        setSettingsError('');
        writeHost(host);
        setMisterHost(host);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
    }, [settingsHost, setMisterHost]);

    return {
        settingsHost, setSettingsHost,
        settingsSaved, settingsError, saveSettings,
    };
}
