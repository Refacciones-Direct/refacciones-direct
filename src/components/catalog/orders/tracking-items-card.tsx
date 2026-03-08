import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MOCK_CART, formatPrice } from '@/data/mock-demo';

export async function TrackingItemsCard() {
  const t = await getTranslations('catalog');

  return (
    <Card data-slot="tracking-items-card">
      <CardHeader>
        <CardTitle className="text-base">{t('orders.itemsInOrder')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {MOCK_CART.items.map((item) => (
          <div key={item.product.id} className="flex items-center gap-3">
            <div className="size-[60px] shrink-0 rounded-md bg-bg-light" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.product.name}</p>
              <p className="text-xs text-muted-foreground">x{item.quantity}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold">
              {formatPrice(item.product.price * item.quantity)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
