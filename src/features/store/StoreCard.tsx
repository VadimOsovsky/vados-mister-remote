import './StoreCard.css';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { PLATFORMS } from '../../constants';
import { storePrice } from './storePreview';
import { getImageUrl, resolveImages, resolveTitle } from '../../services/launchbox';
import { getPreviewCover } from '../collection/previewCovers';
import { LazyImage } from '../../kit/LazyImage';
import { useAppContext } from '../../AppContext';
import { formatGamePrice } from '../../lib/pricing';

export function StoreCard({ game, consoleKey, preview, onSelect }: {
    game: LaunchBoxGame;
    consoleKey: ConsoleKey;
    preview: boolean;
    onSelect: (game: LaunchBoxGame) => void;
}) {
    const platform = PLATFORMS[consoleKey];
    const cover = resolveImages(game, platform.imageRegions).front;
    const title = resolveTitle(game, platform.nameRegions);
    const { economyDisabled } = useAppContext();
    const price = formatGamePrice(storePrice(game, consoleKey, preview, economyDisabled));
    return (
        <button type="button" className="shop-card" onClick={() => onSelect(game)}>
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
    );
}
