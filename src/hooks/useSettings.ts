import { useCallback, useState } from 'react';
import { readAuth, writeAuth, writeHost } from '../lib/storage';
import { initApi } from '../services/screenscraper';

export function useSettings(misterHost: string, setMisterHost: (host: string) => void) {
    const [settingsLogin, setSettingsLogin] = useState(() => readAuth().login);
    const [settingsPassword, setSettingsPassword] = useState(() => readAuth().password);
    const [settingsHost, setSettingsHost] = useState(misterHost);
    const [settingsSaved, setSettingsSaved] = useState(false);

    const saveSettings = useCallback(() => {
        writeAuth(settingsLogin, settingsPassword);
        writeHost(settingsHost);
        setMisterHost(settingsHost);
        if (settingsLogin && settingsPassword) initApi(settingsLogin, settingsPassword);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
    }, [settingsLogin, settingsPassword, settingsHost, setMisterHost]);

    return {
        settingsLogin, setSettingsLogin,
        settingsPassword, setSettingsPassword,
        settingsHost, setSettingsHost,
        settingsSaved, saveSettings,
    };
}
