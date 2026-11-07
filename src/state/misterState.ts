import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { getRomMapping, readHost } from '../lib/storage';
import { subscribeToValues } from '../lib/sharedStorage';
import { isRomPlaying } from '../services/nowPlaying';
import { WizzoApi, type WizzoPlayingResponse } from '../services/wizzoApi';
import type { ConsoleKey } from '../types';

const misterHost = readHost();
type MisterState = {
    misterHost: string;
    api: WizzoApi;
    connected: boolean;
    nowPlaying: WizzoPlayingResponse | null;
    setMisterHost: (host: string) => void;
};

export const useMisterState = create<MisterState>((set) => ({
    misterHost,
    api: new WizzoApi(misterHost),
    connected: false,
    nowPlaying: null,
    setMisterHost: (host: string) => set((state) => state.misterHost === host ? state : {
        misterHost: host, api: new WizzoApi(host), connected: false, nowPlaying: null,
    }),
}));

export function useIsGamePlaying(gameId: string, consoleKey: ConsoleKey) {
    const readMapping = () => getRomMapping(gameId, consoleKey);
    const path = useSyncExternalStore(subscribeToValues, readMapping);
    return useMisterState(state => isRomPlaying(state.nowPlaying, path, consoleKey));
}
