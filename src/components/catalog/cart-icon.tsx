'use client';

import { ShoppingCart } from 'lucide-react';
import { useCartContext } from '@/hooks/use-cart-context';
import { Link } from '@/i18n/navigation';

export function CartIcon({ label }: { label: string }) {
  const { itemCount } = useCartContext();

  return (
    <Link
      href="/cart"
      className="flex flex-col items-center gap-1 text-brand-navy hover:text-brand-red"
    >
      <span className="relative flex size-9 items-center justify-center rounded-full border-[1.5px] border-current">
        <ShoppingCart className="size-5" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white">
            {itemCount}
          </span>
        )}
      </span>
      <span className="text-center text-sm font-medium leading-tight">{label}</span>
    </Link>
  );
}
