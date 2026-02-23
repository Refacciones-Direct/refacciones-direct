import { Package } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface SearchProductCardProps {
  id: number;
  name: string;
  brand: string;
  sku: string;
  price: number | null;
  currency: string;
  imageUrls: string[];
  category: string;
}

export function SearchProductCard({
  id,
  name,
  brand,
  sku,
  price,
  currency,
  imageUrls,
  category,
}: SearchProductCardProps) {
  const formattedPrice =
    price !== null
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(
          price,
        )
      : null;

  // TODO: Link to /parts/{id} when product detail page is implemented
  return (
    <Link
      href={`/search?q=${encodeURIComponent(sku)}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      {/* Image area */}
      <div className="flex h-40 items-center justify-center bg-muted">
        {imageUrls.length > 0 ? (
          <img src={imageUrls[0]} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Package className="size-10 text-muted-foreground/30" />
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1 p-3">
        <span className="text-xs text-muted-foreground">{category}</span>
        <span className="line-clamp-2 text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">
          {brand} · {sku}
        </span>
        {formattedPrice ? (
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-semibold">{formattedPrice}</span>
            <span className="text-xs text-muted-foreground">{currency}</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
