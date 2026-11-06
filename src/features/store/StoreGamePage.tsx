import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { PhotoViewer } from '../../kit/PhotoViewer';
import { GameScreenshots } from '../../kit/GameScreenshots';
import { GameBackdrop } from '../../kit/GameBackdrop';
import { useAppContext } from '../../AppContext';
import { useRomPicker } from '../../hooks/useRomPicker';
import { PlayroomHeader } from '../../kit/PlayroomHeader';
import { ExpandableDescription } from '../../kit/ExpandableDescription';
import { LazyImage } from '../../kit/LazyImage';
import { BackArrowIcon, FlipIcon, StoreIcon } from '../../lib/icons';
import { getImageUrl, loadPlatformGames, resolveImages, resolveScreenshots, resolveTitle } from '../../services/launchbox';
import type { LaunchBoxGame } from '../../types';
import { getPreviewCover, getPreviewScreenshot } from '../collection/previewCovers';
import { StoreRomDialog } from './StoreRomDialog';
import { PurchaseSuccess } from './PurchaseSuccess';
import { formatGamePrice } from '../../lib/pricing';
import { StoreWallet } from './StoreWallet';
import { storePrice } from './storePreview';
import './StoreGamePage.css';

export function StoreGamePage() {
    const { gameId } = useParams();
    const { activeConsole, balance } = useAppContext();
    const [params] = useSearchParams();
    const preview = import.meta.env.DEV && params.get('preview') === '1';
    const backUrl = preview ? '/store?preview=1' : '/store';
    const [loaded, setLoaded] = useState<{ key: string; game?: LaunchBoxGame; error?: boolean }>();
    const key = activeConsole + '/' + gameId;

    useEffect(() => {
        let current = true;
        loadPlatformGames(activeConsole).then(games => {
            if (current) setLoaded({ key, game: games.find(game => game.id === gameId) });
        }).catch(() => {
            if (current) setLoaded({ key, error: true });
        });
        return () => { current = false; };
    }, [activeConsole, gameId, key]);

    if (loaded?.key === key && loaded.game) {
        return <StoreProduct key={key} game={loaded.game} preview={preview} backUrl={backUrl} />;
    }

    return (
        <>
            <StoreDetailHeader backUrl={backUrl} balance={preview ? 120 : balance} />
            <p className="shelf-no-results" role="status">
                {loaded?.key !== key ? 'Loading game…' : loaded.error ? 'Could not load the game.' : 'Game not found.'}
            </p>
        </>
    );
}

function StoreDetailHeader({ backUrl, balance }: { backUrl: string; balance: number }) {
    return (
        <PlayroomHeader>
            <Link to={backUrl} className="store-back">{BackArrowIcon} Back to store</Link>
            <StoreWallet balance={balance} compact />
        </PlayroomHeader>
    );
}

function StoreProduct({ game, preview, backUrl }: { game: LaunchBoxGame; preview: boolean; backUrl: string }) {
    const { api, activeConsole, platform, balance, collectionIds, purchaseGame, economyDisabled } = useAppContext();
    const [back, setBack] = useState(false);
    const [purchased, setPurchased] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState<number>();
    const title = resolveTitle(game, platform.nameRegions);
    const price = storePrice(game, activeConsole, preview, economyDisabled);
    const wallet = preview ? 120 : balance;
    const owned = !preview && collectionIds.includes(game.id);
    const romPicker = useRomPicker(api, platform, game, activeConsole, romPath => {
        if (purchaseGame(game.id, price, romPath)) {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            setPurchased(true);
        }
    }, !preview);
    const images = resolveImages(game, platform.imageRegions);
    const front = (preview && getPreviewCover(activeConsole, game.id)) || (images.front && getImageUrl(images.front));
    const rear = images.back && getImageUrl(images.back);
    const cover = back ? rear : front;
    const coverLabel = back ? 'Back cover' : 'Front cover';
    const previewScreenshot = preview && getPreviewScreenshot(game.id);
    const screenshots = previewScreenshot ? [previewScreenshot] : resolveScreenshots(game).map(src => getImageUrl(src));
    const backdrop = screenshots[0];
    const slides = [front, rear, ...resolveScreenshots(game).map(src => getImageUrl(src))]
        .filter((src): src is string => Boolean(src)).map(src => ({ src }));
    const facts = [
        ['Released', game.year], ['Developer', game.developer], ['Publisher', game.publisher],
        ['Genre', game.genre], ['Players', game.maxPlayers],
    ];

    if (purchased) return <PurchaseSuccess title={title} cover={front || undefined} preview={preview} variant={economyDisabled ? 'addition' : 'purchase'} />;

    return (
        <>
            <StoreDetailHeader backUrl={backUrl} balance={wallet} />
            <main className="page-scroll store-detail">
                <section className="playroom-stage box-counter" aria-label="Inspect game box">
                    <GameBackdrop src={backdrop || undefined} />
                    <p className="store-kicker">{platform.name} · From the game store</p>
                    <div className="counter-art">
                        {cover ? (
                            <button type="button" className="counter-cover" aria-label={`Inspect ${coverLabel.toLowerCase()}`}
                                onClick={() => setGalleryIndex(back && front ? 1 : 0)}>
                                <LazyImage key={cover} src={cover} alt={coverLabel} />
                            </button>
                        ) : <span className="counter-missing">{coverLabel} unavailable</span>}
                    </div>
                    <div className="counter-controls">
                        <span aria-live="polite">{coverLabel}</span>
                        <button type="button" className="playroom-button playroom-icon-button playroom-press"
                            aria-label={back ? 'Show front cover' : 'Show back cover'} onClick={() => setBack(value => !value)}>
                            {FlipIcon}
                        </button>
                    </div>
                </section>
                <article className="store-product">
                    <p className="store-kicker">{[game.publisher, game.year].filter(Boolean).join(' · ')}</p>
                    <h1>{title}</h1>
                    <div className="store-product-badges">
                        {/^[1-9]\d*$/.test(game.maxPlayers.trim()) && <span className="player-badge">{game.maxPlayers.trim()}P</span>}
                        {game.genre && <span>{game.genre}</span>}
                    </div>
                    <section className="store-description">
                        <h2>About the game</h2>
                        <GameScreenshots screenshots={screenshots} />
                        <ExpandableDescription text={game.desc} />
                        <dl>
                            {facts.filter(([, value]) => value).map(([label, value]) => (
                                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                            ))}
                        </dl>
                    </section>
                </article>
            </main>
            <aside className="owned-dock store-dock" aria-label="Purchase">
                {!economyDisabled && <div className="store-dock-price"><small>Price</small><strong>{formatGamePrice(price)}</strong></div>}
                <button className="owned-button owned-gold owned-primary playroom-press"
                    disabled={owned || wallet < price} onClick={() => romPicker.openRomPicker(title)}>
                    {StoreIcon}<span>{owned ? 'In your collection' : wallet < price ? 'Not enough funds' : economyDisabled ? 'Add game' : 'Buy game'}</span>
                </button>
            </aside>
            <StoreRomDialog picker={romPicker} title={title} consoleName={platform.name}
                price={price} preview={preview} canPurchase={!owned && wallet >= price} />
            <PhotoViewer index={galleryIndex ?? null} onClose={() => setGalleryIndex(undefined)} slides={slides} />
        </>
    );
}
