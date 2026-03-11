import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ProductThumbnail({ src, alt, className }: ProductThumbnailProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <Package className="size-1/3 text-muted-foreground/30" />
      )}
    </div>
  );
}
