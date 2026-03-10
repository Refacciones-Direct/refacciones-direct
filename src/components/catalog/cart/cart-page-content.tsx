'use client';

import { ArrowLeft, LogIn, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { useCartContext } from '@/hooks/use-cart-context';
import { CartItemList } from '@/components/catalog/cart/cart-item-list';
import { OrderSummary } from '@/components/catalog/checkout/order-summary';

interface CartPageContentProps {
  isAuthenticated?: boolean;
}

export function CartPageContent({ isAuthenticated = false }: CartPageContentProps) {
  const t = useTranslations('catalog');
  const { items, subtotal, shipping, tax, total } = useCartContext();

  return (
    <>
      {/* Continue shopping link */}
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
      >
        <ArrowLeft className="size-4" />
        {t('cart.continueShopping')}
      </Link>

      {/* Title + print */}
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t('cart.title')}{' '}
          <span className="text-lg font-normal text-muted-foreground">
            {t('cart.itemCount', { count: items.length })}
          </span>
        </h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t('cart.print')}
        >
          <Printer className="size-5" />
        </button>
      </div>

      {/* Auth banner for guests */}
      {!isAuthenticated && (
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-border bg-accent px-5 py-4">
          <LogIn className="size-6 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t('cart.authBannerTitle')}</p>
            <p className="text-[13px] text-muted-foreground">{t('cart.authBannerSubtitle')}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">{t('cart.signIn')}</Link>
          </Button>
        </div>
      )}

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
