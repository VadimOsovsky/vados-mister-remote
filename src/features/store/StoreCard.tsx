import './StoreCard.css';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { PLATFORMS } from '../../constants';
import { storePrice } from './storePreview';
import { getImageUrl, resolveImages, resolveTitle } from '../../services/launchbox';
import { getPreviewCover } from '../collection/previewCovers';
import { LazyImage } from '../../kit/LazyImage';
import { useCollectionState } from '../../state/collectionState';
import { formatGamePrice } from '../../lib/pricing';
import { StoreHeart } from './StoreHeart';

export function StoreCard({ game, consoleKey, preview, canFavorite, onSelect }: {
    game: LaunchBoxGame;
    consoleKey: ConsoleKey;
    preview: boolean;
    canFavorite: boolean;
    onSelect: (game: LaunchBoxGame, card: HTMLButtonElement) => void;
}) {
    const platform = PLATFORMS[consoleKey];
    const cover = resolveImages(game, platform.imageRegions).front;
    const title = resolveTitle(game, platform.nameRegions);
    const economyDisabled = useCollectionState(state => state.economyDisabled);
    const favorite = useCollectionState(state => state.favoriteIds.includes(game.id));
    const toggleFavorite = useCollectionState(state => state.toggleFavorite);
    const price = formatGamePrice(storePrice(game, consoleKey, preview, economyDisabled));
    return (
        <div className="shop-card">
            <button type="button" className="shop-card-open" onClick={event => onSelect(game, event.currentTarget)}>
                <span className="shop-display">
                    <span className="shop-art">
                        <LazyImage src={(preview && getPreviewCover(consoleKey, game.id)) || (cover ? getImageUrl(cover, 300) : undefined)}
                            fallbackSrc={cover ? getImageUrl(cover) : undefined} alt="" />
                    </span>
                    {!economyDisabled && <span className={'shop-price' + (price.length > 5 ? ' wide' : '')}><small>$</small>{price.slice(1)}</span>}
                </span>
                <span className="shop-caption">
                    <strong title={title}>{title}</strong>
                    <span>{[game.year, game.publisher].filter(Boolean).join(' · ')}</span>
                </span>
            </button>
            <button type="button" className="shop-favorite" aria-label={`Favorite ${title}`} aria-pressed={favorite}
                disabled={!canFavorite} onClick={() => toggleFavorite(game.id)}>
                <StoreHeart filled={favorite} />
            </button>
        </div>
    );
}
