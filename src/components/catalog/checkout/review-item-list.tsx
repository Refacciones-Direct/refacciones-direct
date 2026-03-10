import { ProductThumbnail } from '@/components/shared/product-thumbnail';
import type { MockCartItem } from '@/data/mock-demo';
import { formatPrice } from '@/data/mock-demo';

interface ReviewItemListProps {
  items: MockCartItem[];
}

export function ReviewItemList({ items }: ReviewItemListProps) {
  return (
    <div data-slot="review-item-list" className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.product.id} className="flex gap-4 rounded-lg border border-border p-4">
          <ProductThumbnail
            src={item.product.imageUrl}
            alt={item.product.name}
            className="size-16"
          />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.product.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.product.brand} &middot; {item.product.sku}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(item.product.price)} &times; {item.quantity}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold">
              {formatPrice(item.product.price * item.quantity)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
