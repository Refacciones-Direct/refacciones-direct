'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Swiper as SwiperType } from 'swiper/types';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

const banners = [
  { src: '/oscaro.es/oscaro1.webp', alt: 'Promoción 1' },
  { src: '/oscaro.es/oscaro2.webp', alt: 'Promoción 2' },
  { src: '/oscaro.es/oscaro3.webp', alt: 'Promoción 3' },
  { src: '/oscaro.es/oscaro4.webp', alt: 'Promoción 4' },
];

export function PromoCarousel() {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  function toggleAutoplay() {
    const swiper = swiperRef.current;
    if (!swiper) return;
    if (isPlaying) {
      swiper.autoplay.stop();
    } else {
      swiper.autoplay.start();
    }
    setIsPlaying(!isPlaying);
  }

  return (
    <div data-slot="promo-carousel" className="relative h-full overflow-hidden rounded-lg shadow">
      <Swiper
        className="promo-swiper h-full"
        modules={[Autoplay, Navigation, Pagination]}
        slidesPerView={1}
        loop
        autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        navigation={false}
        pagination={{ clickable: true }}
        speed={700}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.src}>
            <div className="relative h-full">
              <Image src={banner.src} alt={banner.alt} fill className="object-cover" priority />
              {/* Bottom gradient so dots/controls stay visible on any image */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom controls — bottom-right overlay */}
      <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={() => swiperRef.current?.slidePrev()}
          className="rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label="Anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={toggleAutoplay}
          className="rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => swiperRef.current?.slideNext()}
          className="rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label="Siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
