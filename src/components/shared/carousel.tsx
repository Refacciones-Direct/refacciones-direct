'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselProps {
  children: React.ReactNode;
  className?: string;
  /** Gap between items in px (default 16) */
  gap?: number;
  /** Accessible label for the carousel region */
  ariaLabel?: string;
}

const FADE_SIZE = 48; // px of the gradient fade on each edge

export function Carousel({ children, className, gap = 16, ariaLabel }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Build a CSS mask that fades the edges where more content exists
  const maskImage = useMemo(() => {
    if (canScrollLeft && canScrollRight) {
      return `linear-gradient(to right, transparent, black ${FADE_SIZE}px, black calc(100% - ${FADE_SIZE}px), transparent)`;
    }
    if (canScrollRight) {
      return `linear-gradient(to right, black calc(100% - ${FADE_SIZE}px), transparent)`;
    }
    if (canScrollLeft) {
      return `linear-gradient(to right, transparent, black ${FADE_SIZE}px)`;
    }
    return undefined;
  }, [canScrollLeft, canScrollRight]);

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="region"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
    >
      {/* Left arrow */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll('left')}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-colors',
          canScrollLeft ? 'cursor-pointer hover:bg-muted' : 'cursor-default opacity-30',
        )}
        disabled={!canScrollLeft}
      >
        <ChevronLeft className="size-5 text-foreground" />
      </button>

      {/* Scrollable content with edge fade */}
      <div
        ref={scrollRef}
        className="scrollbar-none flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto"
        style={{ gap, maskImage, WebkitMaskImage: maskImage }}
      >
        {children}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll('right')}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-colors',
          canScrollRight ? 'cursor-pointer hover:bg-muted' : 'cursor-default opacity-30',
        )}
        disabled={!canScrollRight}
      >
        <ChevronRight className="size-5 text-foreground" />
      </button>
    </div>
  );
}
