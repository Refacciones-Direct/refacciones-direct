'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const ZOOM_SCALE = 2.5;
const ZOOM_DELAY_MS = 800;

interface ProductGalleryProps {
  imageUrl?: string;
}

export function ProductGallery({ imageUrl }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState('center center');
  const delayRef = useRef<ReturnType<typeof setTimeout>>(null);
  const thumbnailCount = 4;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!imageUrl) return;
    delayRef.current = setTimeout(() => setZooming(true), ZOOM_DELAY_MS);
  }, [imageUrl]);

  const handleMouseLeave = useCallback(() => {
    if (delayRef.current) clearTimeout(delayRef.current);
    setZooming(false);
  }, []);

  // Clean up pending timeout on unmount
  useEffect(() => {
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, []);

  return (
    <div data-slot="product-gallery" className="flex flex-col gap-3">
      {/* Main image with hover zoom */}
      <div
        className={cn(
          'relative aspect-square max-h-161 max-w-161 overflow-hidden rounded-lg border bg-white',
          imageUrl && (zooming ? 'cursor-zoom-out' : 'cursor-zoom-in'),
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={imageUrl ? handleMouseMove : undefined}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-contain transition-transform duration-300 ease-out"
            draggable={false}
            style={{
              transform: zooming ? `scale(${ZOOM_SCALE})` : 'scale(1)',
              transformOrigin: origin,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="size-20 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2">
        {Array.from({ length: thumbnailCount }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelectedIndex(i)}
            className={cn(
              'flex size-20 items-center justify-center rounded-md bg-bg-light transition-all',
              selectedIndex === i ? 'ring-2 ring-brand-blue' : 'ring-1 ring-border',
            )}
          >
            {i === 0 && imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full rounded-md object-contain" />
            ) : (
              <Package className="size-6 text-muted-foreground/30" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
