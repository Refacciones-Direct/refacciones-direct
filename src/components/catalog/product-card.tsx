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
      <div className="relative h-40 w-full bg-white">
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full bg-white p-1 shadow-sm text-muted-foreground hover:bg-muted"
        >
          <X className="size-3" />
        </button>
      </div>

      {/* Product info */}
      <div className="flex flex-col gap-1.5 p-3">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{reference}</p>
      </div>
    </div>
  );
}
