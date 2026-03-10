'use client';

import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MOCK_SHIPPING_ADDRESS } from '@/data/mock-demo';

export function PaymentForm() {
  const t = useTranslations('catalog');
  const [sameAsShipping, setSameAsShipping] = useState(true);

  return (
    <div data-slot="payment-form" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('checkout.paymentTitle')}</h2>
        <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700">
          <Lock className="size-4" />
          <span>{t('checkout.secureCheckout')}</span>
        </div>
      </div>

      {/* Card number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">{t('checkout.cardNumber')}</Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="cardNumber" defaultValue="4242 4242 4242 4242" className="pl-10" />
        </div>
      </div>

      {/* Expiry / CVC */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cardExpiry">{t('checkout.cardExpiry')}</Label>
          <Input id="cardExpiry" defaultValue="12/28" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cardCvc">{t('checkout.cardCvc')}</Label>
          <Input id="cardCvc" defaultValue="123" />
        </div>
      </div>

      {/* Name on card */}
      <div className="space-y-2">
        <Label htmlFor="cardName">{t('checkout.cardName')}</Label>
        <Input id="cardName" defaultValue="Juan García López" />
      </div>

      {/* Save card */}
      <div className="flex items-center gap-2">
        <Checkbox id="saveCard" />
        <Label htmlFor="saveCard" className="cursor-pointer font-normal">
          {t('checkout.saveCard')}
        </Label>
      </div>

      <Separator />

      {/* Billing address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('checkout.billingAddress')}</h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="sameAsShipping"
            checked={sameAsShipping}
            onCheckedChange={(checked) => setSameAsShipping(checked === true)}
          />
          <Label htmlFor="sameAsShipping" className="cursor-pointer font-normal">
            {t('checkout.sameAsShipping')}
          </Label>
        </div>

        {!sameAsShipping && (
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <p className="font-medium">{MOCK_SHIPPING_ADDRESS.name}</p>
            <p className="text-muted-foreground">
              {MOCK_SHIPPING_ADDRESS.street} {MOCK_SHIPPING_ADDRESS.extNumber}
              {MOCK_SHIPPING_ADDRESS.intNumber && ` Int. ${MOCK_SHIPPING_ADDRESS.intNumber}`}
            </p>
            <p className="text-muted-foreground">
              {MOCK_SHIPPING_ADDRESS.colonia}, {MOCK_SHIPPING_ADDRESS.municipio}
            </p>
            <p className="text-muted-foreground">
              {MOCK_SHIPPING_ADDRESS.state} {MOCK_SHIPPING_ADDRESS.zip}
            </p>
            <p className="text-muted-foreground">{MOCK_SHIPPING_ADDRESS.phone}</p>
          </div>
        )}
      </div>

      {/* Review order button */}
      <Link href="/checkout/review">
        <Button className="w-full bg-brand-navy text-white hover:bg-brand-navy/90" size="lg">
          {t('checkout.reviewOrder')}
        </Button>
      </Link>
    </div>
  );
}
