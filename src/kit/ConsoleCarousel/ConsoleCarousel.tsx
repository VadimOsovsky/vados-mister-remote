import { useEffect, useRef, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { PLATFORMS } from '../../constants';
import type { ConsoleKey } from '../../types';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import './ConsoleCarousel.css';

export function ConsoleCarousel({ activeConsole, onSwitch }: {
    activeConsole: ConsoleKey;
    onSwitch: (key: ConsoleKey) => void;
}) {
    const items = Object.keys(PLATFORMS) as ConsoleKey[];
    const swiperRef = useRef<SwiperType | null>(null);
    const isProgrammatic = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleSlideChange = useCallback((swiper: SwiperType) => {
        if (isProgrammatic.current) {
            isProgrammatic.current = false;
            return;
        }
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            const key = items[swiper.activeIndex];
            if (key && key !== activeConsole) {
                onSwitch(key);
            }
        }, 400);
    }, [items, activeConsole, onSwitch]);

    useEffect(() => {
        const swiper = swiperRef.current;
        if (!swiper) return;
        const targetIndex = items.indexOf(activeConsole);
        if (targetIndex !== -1 && swiper.activeIndex !== targetIndex) {
            isProgrammatic.current = true;
            swiper.slideTo(targetIndex, 300);
        }
    }, [activeConsole, items]);

    const skipSlides = useCallback((direction: -1 | 1) => {
        const swiper = swiperRef.current;
        if (!swiper) return;
        const target = Math.max(0, Math.min(items.length - 1, swiper.activeIndex + direction * 5));
        if (target === swiper.activeIndex) return;
        isProgrammatic.current = true;
        swiper.slideTo(target, 180);
        const key = items[target];
        if (key) onSwitch(key);
    }, [items, onSwitch]);

    return (
        <div className="console-carousel">
            <div className="carousel-skip-row">
                <button className="carousel-skip-btn" onClick={() => skipSlides(-1)} aria-label="Skip back 5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 20L9 12L19 4" /><path d="M14 20L4 12L14 4" />
                    </svg>
                </button>
                <button className="carousel-skip-btn" onClick={() => skipSlides(1)} aria-label="Skip forward 5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 4L15 12L5 20" /><path d="M10 4L20 12L10 20" />
                    </svg>
                </button>
            </div>
            <Swiper
                modules={[EffectCoverflow]}
                effect="coverflow"
                grabCursor
                centeredSlides
                slidesPerView="auto"
                coverflowEffect={{
                    rotate: 0,
                    stretch: 40,
                    depth: 120,
                    modifier: 2,
                    slideShadows: false,
                }}
                onSwiper={(swiper) => { swiperRef.current = swiper; }}
                onSlideChange={handleSlideChange}
                initialSlide={items.indexOf(activeConsole)}
            >
                {items.map((key, index) => {
                    const platform = PLATFORMS[key];
                    return (
                        <SwiperSlide key={key} className="carousel-slide" onClick={() => swiperRef.current?.slideTo(index)}>
                            <div className="carousel-card">
                                {platform.imageUrl ? (
                                    <img
                                        src={platform.imageUrl}
                                        alt={platform.name}
                                        className="carousel-img"
                                        loading="lazy"
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="carousel-placeholder">
                                        <img src={platform.logo} alt={platform.name} className="carousel-icon-img" />
                                    </div>
                                )}
                            </div>
                            <span className="carousel-label">{platform.name}</span>
                        </SwiperSlide>
                    );
                })}
            </Swiper>
        </div>
    );
}
