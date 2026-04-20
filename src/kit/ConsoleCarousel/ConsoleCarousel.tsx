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

    return (
        <div className="console-carousel">
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
