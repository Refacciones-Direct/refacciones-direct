'use client';

import { CircleCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { DrawerShell } from '@/components/ui/drawer-shell';
import { useCartContext } from '@/hooks/use-cart-context';
import { ProductThumbnail } from '@/components/shared/product-thumbnail';
import type { MockProduct } from '@/data/mock-demo';
import { formatPrice } from '@/data/mock-demo';

interface AddedToCartSidebarProps {
  open: boolean;
  onClose: () => void;
  addedProduct: MockProduct | null;
  addedQuantity: number;
}

export function AddedToCartSidebar({
  open,
  onClose,
  addedProduct,
  addedQuantity,
}: AddedToCartSidebarProps) {
  const t = useTranslations('catalog.addedToCart');
  const { subtotal, itemCount } = useCartContext();

  return (
    <DrawerShell open={open} onClose={onClose} ariaLabel={t('title')}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <CircleCheck className="size-5 text-emerald-600" />
          <span className="text-base font-semibold text-foreground">{t('title')}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t('close')}
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Product info */}
      {addedProduct && (
        <div className="flex shrink-0 gap-4 border-b border-border px-5 py-5">
          <ProductThumbnail
            src={addedProduct.imageUrl}
            alt={addedProduct.name}
            className="size-18 bg-muted"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">{addedProduct.name}</span>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">
                {t('qty', { count: addedQuantity })}
              </span>
              <span className="text-base font-bold text-foreground">
                {formatPrice(addedProduct.price * addedQuantity)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cart subtotal + actions */}
      <div className="flex flex-col items-center gap-4 px-5 py-6">
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-medium text-foreground">{t('cartSubtotal')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{formatPrice(subtotal)}</span>
            <span className="text-[13px] text-muted-foreground">
              ({t('itemCount', { count: itemCount })})
            </span>
          </div>
        </div>

        <Button
          asChild
          size="lg"
          className="w-full bg-brand-navy text-white hover:bg-brand-navy/90"
        >
          <Link href="/cart">{t('viewCartAndCheckout')}</Link>
        </Button>

        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-primary underline hover:text-primary/80"
        >
          {t('continueShopping')}
        </button>
      </div>
    </DrawerShell>
  );
}
