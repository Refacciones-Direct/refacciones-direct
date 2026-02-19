import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  name: string;
  reference: string;
}

export function ProductCard({ name, reference }: ProductCardProps) {
  return (
    <div
      data-slot="product-card"
      className={cn('w-[220px] overflow-hidden rounded-lg border border-border bg-card')}
    >
      {/* Image placeholder */}
      <div className="relative h-40 w-full bg-bg-light">
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-muted-foreground hover:bg-white"
        >
          <X className="size-3" />
        </button>
      </div>

      {/* Product info */}
      <div className="p-3">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{reference}</p>
      </div>
    </div>
  );
}
