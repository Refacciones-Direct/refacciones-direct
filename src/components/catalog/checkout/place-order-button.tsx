'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useCartContext } from '@/hooks/use-cart-context';

export function PlaceOrderButton() {
  const t = useTranslations('catalog');
  const router = useRouter();
  const { clearCart } = useCartContext();
  const [isPlacing, setIsPlacing] = useState(false);

  async function handlePlaceOrder() {
    setIsPlacing(true);
    // Simulate API latency (replace with real call when available)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    clearCart();
    setIsPlacing(false);
    router.push('/orders/RD-20260305-001/confirmation');
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full bg-brand-navy text-white hover:bg-brand-navy/90 disabled:opacity-100"
        disabled={isPlacing}
        onClick={handlePlaceOrder}
      >
        {isPlacing ? <Spinner /> : t('review.placeOrder')}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t('review.termsNotice')}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}
