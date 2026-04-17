import type { SSGame } from '../../types';
import { LazyImage } from '../../kit/LazyImage';
import { resolveFrontThumb } from '../../services/screenscraper';
import './GameGrid.css';

export function GameGrid({ games, regions, onSelect }: {
    games: SSGame[];
    regions: string[];
    onSelect: (game: SSGame) => void;
}) {
    return (
        <div className="game-grid">
            {games.map((game) => {
                const front = resolveFrontThumb(game, regions);
                const rotStyle = front?.rotation ? { transform: `rotate(${front.rotation}deg)` } : undefined;
                return (
                    <div key={game.id} className="game-card" onClick={() => onSelect(game)}>
                        <div className="card-art-wrap">
                            <LazyImage src={front?.src} alt={game.name} className="card-art" style={rotStyle} />
                        </div>
                        <div className="card-badge">
                            <div className="card-title">{game.name}</div>
                            <div className="card-year">{String(game.releaseDate ?? '').substring(0, 4)}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
