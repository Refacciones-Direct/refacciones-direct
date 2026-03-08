'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/data/mock-demo';

interface OrderSummaryProps {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  showCheckoutButton?: boolean;
}

export function OrderSummary({
  subtotal,
  shipping,
  tax,
  total,
  showCheckoutButton,
}: OrderSummaryProps) {
  const t = useTranslations('catalog');

  return (
    <Card data-slot="order-summary">
      <CardHeader>
        <CardTitle>{t('cart.orderSummary')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{t('cart.subtotal')}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>{t('cart.shipping')}</span>
            <span className={shipping === 0 ? 'font-medium text-emerald-600' : ''}>
              {shipping === 0 ? t('cart.shippingFree') : formatPrice(shipping)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>{t('cart.tax')}</span>
            <span>{formatPrice(tax)}</span>
          </div>

          <Separator />

          <div className="flex items-center justify-between font-bold">
            <span>{t('cart.total')}</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {showCheckoutButton && (
          <Button
            asChild
            size="lg"
            className="w-full bg-brand-navy text-white hover:bg-brand-navy/90"
          >
            <Link href="/checkout/shipping">{t('cart.proceedToCheckout')}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
