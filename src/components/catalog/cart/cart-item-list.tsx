'use client';

import { ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { CartItemCard } from '@/components/catalog/cart/cart-item-card';
import { useCartContext } from '@/hooks/use-cart-context';

export function CartItemList() {
  const t = useTranslations('catalog');
  const { items, updateQuantity, removeItem } = useCartContext();

  if (items.length === 0) {
    return (
      <div
        data-slot="cart-item-list"
        className="flex flex-col items-center gap-4 rounded-lg border border-border py-16"
      >
        <ShoppingCart className="size-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">{t('cart.emptyCart')}</p>
        <Button asChild variant="outline">
          <Link href="/">{t('cart.continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div data-slot="cart-item-list" className="flex flex-col gap-4">
      {items.map((item) => (
        <CartItemCard
          key={item.product.id}
          item={item}
          onQuantityChange={(qty) => updateQuantity(item.product.id, qty)}
          onRemove={() => removeItem(item.product.id)}
        />
      ))}
    </div>
  );
}
