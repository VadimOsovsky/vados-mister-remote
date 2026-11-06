import { useRef, useState } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { LazyImage } from './LazyImage';

export function GameScreenshots({ screenshots }: { screenshots: string[] }) {
    const [scene, setScene] = useState(0);
    const swiperRef = useRef<SwiperInstance | null>(null);
    const count = screenshots.length;

    if (!count) return null;

    return <figure className="owned-scene">
            <Swiper className="owned-scene-carousel" rewind slidesPerView={1}
                onSwiper={swiper => { swiperRef.current = swiper; }}
                onSlideChange={swiper => setScene(swiper.activeIndex)}>
                {screenshots.map((src, index) => <SwiperSlide key={src}>
                    <div className="owned-scene-screen">
                        <LazyImage src={src} alt={`Gameplay screenshot ${index + 1}`} />
                    </div>
                </SwiperSlide>)}
            </Swiper>
            {count > 1 && <figcaption className="owned-scene-controls">
                <button className="owned-button owned-icon playroom-press" aria-label="Previous screenshot" onClick={() => swiperRef.current?.slidePrev()}>‹</button>
                <div className="owned-scene-dots">
                    {screenshots.map((src, index) => <button key={src} aria-label={`Screenshot ${index + 1}`} aria-pressed={index === scene} onClick={() => swiperRef.current?.slideTo(index)} />)}
                </div>
                <button className="owned-button owned-icon playroom-press" aria-label="Next screenshot" onClick={() => swiperRef.current?.slideNext()}>›</button>
            </figcaption>}
        </figure>;
}
