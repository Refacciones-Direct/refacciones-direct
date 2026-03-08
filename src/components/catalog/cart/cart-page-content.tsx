'use client';

import { useTranslations } from 'next-intl';
import { useCartContext } from '@/hooks/use-cart-context';
import { CartItemList } from '@/components/catalog/cart/cart-item-list';
import { OrderSummary } from '@/components/catalog/checkout/order-summary';

export function CartPageContent() {
  const t = useTranslations('catalog');
  const { items, subtotal, shipping, tax, total } = useCartContext();

  return (
    <>
      <h1 className="text-2xl font-bold">
        {t('cart.title')}{' '}
        <span className="text-lg font-normal text-muted-foreground">
          {t('cart.itemCount', { count: items.length })}
        </span>
      </h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <CartItemList />
        </div>
        <div className="lg:col-span-3">
          <OrderSummary
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            total={total}
            showCheckoutButton
          />
        </div>
      </div>
    </>
  );
}
