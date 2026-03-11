'use client';

import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVehicleContext } from '@/hooks/use-vehicle-context';
import { QuantityStepper } from '@/components/catalog/pdp/quantity-stepper';
import { ProductThumbnail } from '@/components/shared/product-thumbnail';
import type { MockCartItem } from '@/data/mock-demo';
import { formatPrice } from '@/data/mock-demo';

interface CartItemCardProps {
  item: MockCartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItemCard({ item, onQuantityChange, onRemove }: CartItemCardProps) {
  const t = useTranslations('catalog');
  const { vehicle } = useVehicleContext();

  const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null;

  return (
    <div data-slot="cart-item-card" className="flex gap-4 rounded-lg border border-border p-4">
      <ProductThumbnail src={item.product.imageUrl} alt={item.product.name} className="size-25" />

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold">{item.product.name}</h3>
            <p className="text-xs text-muted-foreground">
              {item.product.brand} &middot; {item.product.sku}
            </p>
            {vehicleLabel && (
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <CircleCheck className="size-3" />
                <span>{t('cart.compatibleWith', { vehicle: vehicleLabel })}</span>
              </div>
            )}
          </div>
          <span className="shrink-0 text-lg font-bold">
            {formatPrice(item.product.price * item.quantity)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <QuantityStepper value={item.quantity} onChange={onQuantityChange} />
          <div className="flex items-center gap-3">
            <button type="button" className="text-xs text-brand-blue hover:underline">
              {t('cart.saveForLater')}
            </button>
            <button
              type="button"
              className="text-xs text-destructive hover:underline"
              onClick={onRemove}
            >
              {t('cart.remove')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
