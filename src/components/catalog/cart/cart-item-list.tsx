'use client';

import { CartItemCard } from '@/components/catalog/cart/cart-item-card';
import { MOCK_CART } from '@/data/mock-demo';

export function CartItemList() {
  return (
    <div data-slot="cart-item-list" className="flex flex-col gap-4">
      {MOCK_CART.items.map((item, i) => (
        <CartItemCard key={i} item={item} />
      ))}
    </div>
  );
}
