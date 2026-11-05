import { createContext, useContext } from 'react';
import type { ConsoleKey, PlatformDef } from './types';
import type { WizzoApi, WizzoPlayingResponse } from './services/wizzoApi';

export interface AppContextValue {
    activeConsole: ConsoleKey;
    setActiveConsole: (key: ConsoleKey) => void;
    platform: PlatformDef;
    api: WizzoApi;
    connected: boolean;
    nowPlaying: WizzoPlayingResponse | null;
    isGamePlaying: (gameId: string, consoleKey: ConsoleKey) => boolean;
    misterHost: string;
    setMisterHost: (host: string) => void;
    collectionIds: string[];
    addToCollection: (gameId: string) => void;
    removeFromCollection: (gameId: string) => void;
    favoriteIds: string[];
    toggleFavorite: (gameId: string) => void;
    beatenIds: string[];
    markAsBeaten: (gameId: string) => void;
    unmarkAsBeaten: (gameId: string) => void;
    balance: number;
    freeGames: boolean;
    setFreeGames: (enabled: boolean) => void;
    purchaseGame: (gameId: string, price: number, romPath: string) => boolean;
}

export const AppContext = createContext<AppContextValue>(null!);

export function useAppContext() {
    return useContext(AppContext);
}
