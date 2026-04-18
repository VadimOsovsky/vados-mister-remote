import { useCallback, useState } from 'react';
import { writeHost } from '../lib/storage';

export function useSettings(misterHost: string, setMisterHost: (host: string) => void) {
    const [settingsHost, setSettingsHost] = useState(misterHost);
    const [settingsSaved, setSettingsSaved] = useState(false);

    const saveSettings = useCallback(() => {
        writeHost(settingsHost);
        setMisterHost(settingsHost);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
    }, [settingsHost, setMisterHost]);

    return {
        settingsHost, setSettingsHost,
        settingsSaved, saveSettings,
    };
}
