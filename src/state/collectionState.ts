import { create } from 'zustand';
import { PLATFORMS, STARTER_CONSOLE } from '../constants';
import type { ConsoleKey } from '../types';
import { batchStorageWrites, subscribeToValues } from '../lib/sharedStorage';
import {
    readActiveConsole, writeActiveConsole, getCollectionIds, addCollectionId, removeCollectionId,
    getFavoriteIds, setFavorite, getBeatenIds, addBeatenId, removeBeatenId,
    getWalletBalance, readEconomyDisabled, writeEconomyDisabled, setRomMapping,
    getOwnedConsoles, writeOwnedConsoles, initializeOwnedConsoles,
} from '../lib/storage';
import { rewardBeatenGame, spendWallet, visitWallet } from '../lib/wallet';
import { consolePrice } from '../lib/consolePricing';

const preserveIds = <T,>(next: T[], previous?: T[]) =>
    previous && next.length === previous.length && next.every((id, index) => id === previous[index])
        ? previous : next;

function readCollection(previous?: ReturnType<typeof readCollectionSnapshot>) {
    const next = readCollectionSnapshot();
    return {
        ...next,
        collectionIds: preserveIds(next.collectionIds, previous?.collectionIds),
        favoriteIds: preserveIds(next.favoriteIds, previous?.favoriteIds),
        beatenIds: preserveIds(next.beatenIds, previous?.beatenIds),
        ownedConsoles: preserveIds(next.ownedConsoles, previous?.ownedConsoles),
    };
}

function readCollectionSnapshot() {
    const activeConsole = readActiveConsole() ?? STARTER_CONSOLE;
    return {
        activeConsole,
        ownedConsoles: getOwnedConsoles(),
        collectionIds: getCollectionIds(activeConsole),
        favoriteIds: getFavoriteIds(activeConsole),
        beatenIds: getBeatenIds(activeConsole),
        balance: getWalletBalance(),
        economyDisabled: readEconomyDisabled(),
    };
}

type Feedback = {
    walletNotice: { amount: number; id: number } | null;
    completion: { title: string; balance: number } | null;
};
const emptyFeedback: Feedback = { walletNotice: null, completion: null };

type CollectionState = ReturnType<typeof readCollectionSnapshot> & Feedback & {
    setActiveConsole: (key: ConsoleKey) => void;
    setEconomyDisabled: (disabled: boolean) => void;
    dismissCompletion: () => void;
    visit: () => void;
    addToCollection: (id: string) => void;
    toggleFavorite: (id: string) => void;
    removeFromCollection: (id: string) => void;
    purchaseGame: (id: string, price: number, romPath: string) => boolean;
    purchaseConsole: (key: ConsoleKey) => boolean;
    markAsBeaten: (id: string, title: string) => void;
    unmarkAsBeaten: (id: string) => void;
};

export const useCollectionState = create<CollectionState>((set, get) => ({
    activeConsole: STARTER_CONSOLE,
    ownedConsoles: [STARTER_CONSOLE],
    collectionIds: [],
    favoriteIds: [],
    beatenIds: [],
    balance: 0,
    economyDisabled: false,
    ...emptyFeedback,
    setActiveConsole: writeActiveConsole,
    setEconomyDisabled: (disabled: boolean) => {
        writeEconomyDisabled(disabled);
        set(emptyFeedback);
    },
    dismissCompletion: () => set({ completion: null }),
    visit: () => {
        const { reward } = batchStorageWrites(visitWallet);
        if (reward) set({ walletNotice: { amount: reward, id: Date.now() } });
    },
    addToCollection: (id: string) => addCollectionId(get().activeConsole, id),
    toggleFavorite: (id: string) => {
        const key = get().activeConsole;
        setFavorite(key, id, !getFavoriteIds(key).includes(id));
    },
    removeFromCollection: (id: string) => batchStorageWrites(() => {
        const key = get().activeConsole;
        removeCollectionId(key, id);
        setFavorite(key, id, false);
    }),
    purchaseGame: (id: string, price: number, romPath: string) => {
        const key = get().activeConsole;
        const free = readEconomyDisabled();
        const purchased = batchStorageWrites(() => {
            if (getCollectionIds(key).includes(id) || spendWallet(price) === null) return false;
            setRomMapping(id, key, romPath);
            addCollectionId(key, id);
            return true;
        });
        if (purchased && !free && price > 0) set({ walletNotice: { amount: -price, id: Date.now() } });
        return purchased;
    },
    purchaseConsole: key => {
        const owned = getOwnedConsoles();
        const price = consolePrice(key, owned);
        if (price === null) return false;
        const free = readEconomyDisabled();
        const purchased = batchStorageWrites(() => {
            if (spendWallet(price) === null) return false;
            writeOwnedConsoles([...owned, key]);
            return true;
        });
        if (purchased && !free) set({ walletNotice: { amount: -price, id: Date.now() } });
        return purchased;
    },
    markAsBeaten: (id: string, title: string) => {
        const result = batchStorageWrites(() => {
            addBeatenId(get().activeConsole, id);
            return rewardBeatenGame(id);
        });
        if (result.reward) set({ completion: { title, balance: result.balance } });
    },
    unmarkAsBeaten: (id: string) => removeBeatenId(get().activeConsole, id),
}));

export function usePlatform() {
    return useCollectionState(state => PLATFORMS[state.activeConsole]);
}

export function initializeCollectionState() {
    initializeOwnedConsoles();
    const refresh = () => useCollectionState.setState(previous => readCollection(previous));
    refresh();
    return subscribeToValues(refresh);
}
