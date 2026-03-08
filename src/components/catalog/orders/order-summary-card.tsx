import { CreditCard } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MOCK_CART, formatPrice } from '@/data/mock-demo';

export async function OrderSummaryCard() {
  const t = await getTranslations('catalog');

  return (
    <Card data-slot="order-summary-card">
      <CardHeader>
        <CardTitle>{t('confirmation.orderSummary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item list */}
        <div className="space-y-3">
          {MOCK_CART.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-4">
              <div className="size-14 shrink-0 rounded-md bg-bg-light" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{item.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.product.brand} · x{item.quantity}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold">
                {formatPrice(item.product.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('cart.subtotal')}</span>
            <span>{formatPrice(MOCK_CART.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('cart.shipping')}</span>
            <span className="font-medium text-emerald-600">{t('cart.shippingFree')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('cart.tax')}</span>
            <span>{formatPrice(MOCK_CART.tax)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>{t('cart.total')}</span>
            <span>{formatPrice(MOCK_CART.total)}</span>
          </div>
        </div>

        <Separator />

        {/* Payment method */}
        <div className="flex items-center gap-3">
          <CreditCard className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('confirmation.paymentMethod')}
            </p>
            <p className="text-sm font-semibold">{t('confirmation.cardEnding')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
