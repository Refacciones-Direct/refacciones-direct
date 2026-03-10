'use client';

import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { OrderSummary } from '@/components/catalog/checkout/order-summary';
import { PlaceOrderButton } from '@/components/catalog/checkout/place-order-button';
import { ReviewItemList } from '@/components/catalog/checkout/review-item-list';
import { useCartContext } from '@/hooks/use-cart-context';

export function ReviewContent() {
  const t = useTranslations('catalog');
  const { items, subtotal, shipping, tax, total } = useCartContext();

  return (
    <>
      <div className="lg:col-span-7">
        <Separator />

        {/* Items */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t('review.items', { count: items.length })}</h3>
          </div>
          <ReviewItemList items={items} />
        </div>
      </div>

      <div className="space-y-4 lg:col-span-3">
        <OrderSummary subtotal={subtotal} shipping={shipping} tax={tax} total={total} />
        <PlaceOrderButton />
      </div>
    </>
  );
}
