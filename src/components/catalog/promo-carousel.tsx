'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Zap } from 'lucide-react';
import type { Swiper as SwiperType } from 'swiper/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

type BannerLayout = 'left' | 'center' | 'right';

interface BannerConfig {
  id: string;
  layout: BannerLayout;
  bgClass: string;
  bgStyle?: React.CSSProperties;
  bgImage: string;
  bgImageOpacity: string;
  headlineClass: string;
  subClass: string;
  ctaClass: string;
  CtaIcon: React.ComponentType<{ className?: string }>;
  hasBadge?: boolean;
  badgeClass?: string;
}

const banners: BannerConfig[] = [
  {
    id: 'inventory',
    layout: 'left',
    bgClass: 'bg-brand-blue-bg',
    bgImage: '/banners/inventory-bg.jpg',
    bgImageOpacity: 'opacity-10',
    headlineClass: 'text-primary',
    subClass: 'text-muted-foreground',
    ctaClass: 'bg-brand-blue text-white hover:bg-brand-blue/90',
    CtaIcon: ArrowRight,
  },
  {
    id: 'brands',
    layout: 'center',
    bgClass: 'bg-bg-section',
    bgImage: '/banners/brands-bg.jpg',
    bgImageOpacity: 'opacity-10',
    headlineClass: 'text-primary',
    subClass: 'text-muted-foreground',
    ctaClass: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    CtaIcon: ArrowRight,
  },
  {
    id: 'sale',
    layout: 'right',
    bgClass: '',
    bgStyle: { backgroundColor: '#fef7f6' },
    bgImage: '/banners/sale-bg.jpg',
    bgImageOpacity: 'opacity-10',
    headlineClass: 'text-primary',
    subClass: 'text-muted-foreground',
    ctaClass: 'bg-brand-red text-white hover:bg-brand-red-hover',
    CtaIcon: ArrowRight,
    hasBadge: true,
    badgeClass: 'bg-brand-red text-white',
  },
  {
    id: 'performance',
    layout: 'center',
    bgClass: 'bg-primary',
    bgImage: '/banners/performance-bg.jpg',
    bgImageOpacity: 'opacity-15',
    headlineClass: 'text-white',
    subClass: 'text-white/70',
    ctaClass: 'bg-brand-blue text-white hover:bg-brand-blue/90',
    CtaIcon: Zap,
  },
];

const layoutClasses: Record<BannerLayout, string> = {
  left: 'flex items-center pl-14',
  center: 'flex items-center justify-center text-center',
  right: 'flex items-center justify-end pr-14',
};

const contentWidthClasses: Record<BannerLayout, string> = {
  left: 'max-w-md',
  center: 'max-w-lg',
  right: 'max-w-md',
};

function BannerSlide({
  banner,
  t,
}: {
  banner: BannerConfig;
  t: ReturnType<typeof useTranslations>;
}) {
  const {
    id,
    layout,
    bgClass,
    bgStyle,
    bgImage,
    bgImageOpacity,
    headlineClass,
    subClass,
    ctaClass,
    CtaIcon,
    hasBadge,
    badgeClass,
  } = banner;

  return (
    <div className={cn('relative h-full', bgClass)} style={bgStyle}>
      <Image
        src={bgImage}
        alt=""
        fill
        className={cn('object-cover', bgImageOpacity)}
        sizes="(max-width: 1280px) 100vw, 1120px"
      />
      <div className={cn('relative h-full', layoutClasses[layout])}>
        <div className={cn('space-y-3.5', contentWidthClasses[layout])}>
          {hasBadge && (
            <span
              className={cn(
                'inline-block rounded px-3 py-1 text-xs font-semibold tracking-wider',
                badgeClass,
              )}
            >
              {t(`${id}.badge`)}
            </span>
          )}
          <h2 className={cn('text-2xl font-semibold leading-tight', headlineClass)}>
            {t(`${id}.headline`)}
          </h2>
          <p className={cn('text-sm leading-relaxed', subClass)}>{t(`${id}.subheadline`)}</p>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
              ctaClass,
            )}
          >
            {t(`${id}.cta`)}
            <CtaIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromoCarousel() {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const t = useTranslations('catalog.promoCarousel');

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
    <div data-slot="promo-carousel" className="relative h-75 overflow-hidden rounded-lg shadow">
      <Swiper
        className="promo-swiper h-full"
        modules={[Autoplay, Navigation, Pagination]}
        slidesPerView={1}
        loop
        autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        navigation={false}
        pagination={{ clickable: true }}
        speed={700}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <BannerSlide banner={banner} t={t} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom controls — bottom-right overlay */}
      <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={() => swiperRef.current?.slidePrev()}
          className="rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label={t('controls.previous')}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={toggleAutoplay}
          className="rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label={isPlaying ? t('controls.pause') : t('controls.play')}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => swiperRef.current?.slideNext()}
          className="rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
          aria-label={t('controls.next')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
