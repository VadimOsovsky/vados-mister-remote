import type { LaunchBoxGame } from '../../types';
import { LazyImage } from '../../kit/LazyImage';
import { getImageUrl, resolveImages } from '../../services/launchbox';
import './GameGrid.css';

export function GameGrid({ games, regions, onSelect }: {
    games: LaunchBoxGame[];
    regions: string[];
    onSelect: (game: LaunchBoxGame) => void;
}) {
    return (
        <div className="game-grid">
            {games.map((game) => {
                const images = resolveImages(game, regions);
                const frontSrc = images.front ? getImageUrl(images.front) : undefined;
                return (
                    <div key={game.id} className="game-card" onClick={() => onSelect(game)}>
                        <div className="card-art-wrap">
                            <LazyImage src={frontSrc} alt={game.title} className="card-art" />
                        </div>
                        <div className="card-badge">
                            <div className="card-title">{game.title}</div>
                            <div className="card-year">{game.year}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
