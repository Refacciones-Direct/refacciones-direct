'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  imageUrl?: string;
}

export function ProductGallery({ imageUrl }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnailCount = 4;

  return (
    <div data-slot="product-gallery" className="flex flex-col gap-3">
      {/* Main image */}
      <div className="flex aspect-square items-center justify-center rounded-lg bg-white">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full rounded-lg object-contain" />
        ) : (
          <Package className="size-20 text-muted-foreground/30" />
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
