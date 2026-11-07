import { useRef, useState } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import type { ConsoleKey, LaunchBoxGame } from '../../types';
import { usePlatform } from '../../state/collectionState';
import { useMisterState, useIsGamePlaying } from '../../state/misterState';
import { getRomMapping, getSaveSlots, getGameSaveKey } from '../../lib/storage';
import { PlayIcon } from '../../lib/icons';
import { launchCollectionGame, loadCollectionSave } from '../../services/collectionLauncher';
import { GameCard } from './GameGrid';
import './RecentlyPlayed.css';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatLaunchTime(timestamp: number) {
    const now = new Date();
    const launched = new Date(timestamp);
    const minutes = Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000));
    const calendarDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.max(0, (calendarDay(now) - calendarDay(launched)) / 86_400_000);
    if (days >= 1) return relativeTime.format(-days, 'day');
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return relativeTime.format(-minutes, 'minute');
    return relativeTime.format(-Math.floor(minutes / 60), 'hour');
}

export function RecentlyPlayed({ games, consoleKey, preview, mock, onSelect, onHistoryChange }: {
    games: { game: LaunchBoxGame; launchedAt: number }[];
    consoleKey: ConsoleKey;
    preview: boolean;
    mock: boolean;
    onSelect: (game: LaunchBoxGame) => void;
    onHistoryChange: () => void;
}) {
    const api = useMisterState(state => state.api);
    const connected = useMisterState(state => state.connected);
    const platform = usePlatform();
    const [selectedId, setSelectedId] = useState(games[0].game.id);
    const [launching, setLaunching] = useState(false);
    const [failed, setFailed] = useState(false);
    const track = useRef<SwiperInstance | null>(null);
    const selected = games.find(({ game }) => game.id === selectedId) ?? games[0];
    const playing = useIsGamePlaying(selected.game.id, consoleKey);

    async function continuePlaying() {
        if (playing) return;
        const { game } = selected;
        const romPath = getRomMapping(game.id, consoleKey);
        if (mock || !romPath) {
            onSelect(game);
            return;
        }
        setLaunching(true);
        setFailed(false);
        try {
            const slots = getSaveSlots(getGameSaveKey(game.id, consoleKey));
            const latestIndex = slots
                .map((slot, index) => ({ slot, index }))
                .filter(({ slot }) => slot !== null)
                .sort((a, b) => Date.parse(b.slot!.savedAt) - Date.parse(a.slot!.savedAt))[0]?.index;
            if (latestIndex !== undefined) {
                await loadCollectionSave(api, consoleKey, game.id, latestIndex, romPath);
            } else {
                await launchCollectionGame(api, consoleKey, game.id, romPath);
            }
        } catch {
            setFailed(true);
        } finally {
            setLaunching(false);
            onHistoryChange();
        }
    }

    return (
        <section className="playroom-stage recent-shelf" aria-labelledby="recent-heading">
            <div className="recent-shelf-heading">
                <div className="recent-console">
                    <strong>{platform.name}</strong>
                    {platform.branding && <span>{platform.branding}</span>}
                </div>
                <span className="recent-section-label">Recently played</span>
                <h2 id="recent-heading">Ready to jump back in?</h2>
            </div>
            <Swiper className="recent-track" tabIndex={0} role="group"
                aria-label="Choose a game. Swipe or use the arrow keys."
                centeredSlides slidesPerView="auto" spaceBetween={16}
                speed={matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200}
                onSwiper={swiper => { track.current = swiper; }}
                onSlideChange={swiper => {
                    setSelectedId(games[swiper.activeIndex]?.game.id ?? games[0].game.id);
                    setFailed(false);
                }}
                onKeyDown={event => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    if (event.key === 'ArrowLeft') track.current?.slidePrev();
                    else track.current?.slideNext();
                }}>
                {games.map(({ game, launchedAt }, index) => {
                    const isSelected = game.id === selected.game.id;
                    return (
                        <SwiperSlide key={game.id} className="recent-card" data-selected={isSelected}>
                            <GameCard game={game} regions={platform.imageRegions} activeConsole={consoleKey}
                                onSelect={onSelect} preview={preview} recent={{
                                    selected: isSelected,
                                    mockSaves: mock ? [2, 1, 3][index] : undefined,
                                    time: <time dateTime={new Date(launchedAt).toISOString()}>{formatLaunchTime(launchedAt)}</time>,
                                }} />
                        </SwiperSlide>
                    );
                })}
            </Swiper>
            <div className="recent-actions">
                <button type="button" className="playroom-primary playroom-press" disabled={(!mock && !connected) || launching || playing}
                    onClick={continuePlaying}>{PlayIcon} {launching ? 'Launching…' : playing ? 'Now playing' : 'Continue'}</button>
                {failed && <p role="alert">Could not continue. Try again or open the game.</p>}
            </div>
        </section>
    );
}
