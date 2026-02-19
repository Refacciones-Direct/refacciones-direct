'use client';

import { useTranslations } from 'next-intl';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { cn } from '@/lib/utils';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

const slides = [
  {
    titleKey: 'promoCarousel.slide1Title',
    discountKey: 'promoCarousel.slide1Discount',
    ctaKey: 'promoCarousel.slide1Cta',
    bg: 'bg-brand-blue',
  },
  {
    titleKey: 'promoCarousel.slide2Title',
    discountKey: 'promoCarousel.slide2Discount',
    ctaKey: 'promoCarousel.slide2Cta',
    bg: 'bg-brand-navy',
  },
  {
    titleKey: 'promoCarousel.slide3Title',
    discountKey: 'promoCarousel.slide3Discount',
    ctaKey: 'promoCarousel.slide3Cta',
    bg: 'bg-brand-red',
  },
] as const;

export function PromoCarousel() {
  const t = useTranslations('storefront');

  return (
    <div data-slot="promo-carousel" className="h-full overflow-hidden rounded-lg shadow">
      <Swiper
        className="promo-swiper h-full"
        modules={[Autoplay, Pagination]}
        slidesPerView={1}
        loop
        autoplay={{ delay: 3500, pauseOnMouseEnter: true }}
        pagination={{ clickable: true }}
        speed={700}
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.titleKey}>
            <div className={cn('flex h-full flex-col justify-center gap-4 p-8', slide.bg)}>
              <p className="whitespace-pre-line text-4xl font-extrabold leading-tight text-white">
                {t(slide.titleKey)}
              </p>
              <p className="text-5xl font-extrabold text-white">{t(slide.discountKey)}</p>
              <button
                type="button"
                className="w-fit rounded-md bg-white px-5 py-2 text-sm font-semibold text-brand-navy hover:bg-white/90"
              >
                {t(slide.ctaKey)}
              </button>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
