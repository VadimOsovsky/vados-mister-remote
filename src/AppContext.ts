import { createContext, useContext } from 'react';
import type { ConsoleKey, PlatformDef } from './types';
import type { WizzoApi } from './services/wizzoApi';

export interface AppContextValue {
    activeConsole: ConsoleKey;
    setActiveConsole: (key: ConsoleKey) => void;
    platform: PlatformDef;
    api: WizzoApi;
    connected: boolean;
    misterHost: string;
    setMisterHost: (host: string) => void;
    collectionIds: string[];
    addToCollection: (gameId: string) => void;
    removeFromCollection: (gameId: string) => void;
    beatenIds: string[];
    markAsBeaten: (gameId: string) => void;
    unmarkAsBeaten: (gameId: string) => void;
}

export const AppContext = createContext<AppContextValue>(null!);

export function useAppContext() {
    return useContext(AppContext);
}
