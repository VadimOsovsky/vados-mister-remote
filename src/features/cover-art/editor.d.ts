export interface CoverGame {
    id: string;
    title: string;
    year: string;
    description: string;
    art: string;
    screen: string;
    manual?: string;
    gameLogo?: string;
}
export function mountCoverEditor(
    root: HTMLElement,
    games: CoverGame[],
    initialGameId?: string,
): () => void;
