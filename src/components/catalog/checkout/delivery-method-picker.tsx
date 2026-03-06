'use client';

import { Truck, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function DeliveryMethodPicker() {
  const t = useTranslations('catalog');
  const [selected, setSelected] = useState('standard');

  return (
    <div data-slot="delivery-method-picker" className="space-y-4">
      <h3 className="text-lg font-semibold">{t('checkout.deliveryMethod')}</h3>

      <RadioGroup value={selected} onValueChange={setSelected} className="grid gap-3">
        {/* Standard shipping */}
        <Label
          htmlFor="standard"
          className={cn(
            'flex cursor-pointer items-center gap-4 rounded-lg border border-border p-4 transition-all',
            selected === 'standard' && 'ring-2 ring-brand-navy',
          )}
        >
          <RadioGroupItem value="standard" id="standard" />
          <Truck className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{t('checkout.standardShipping')}</p>
            <p className="text-sm text-muted-foreground">{t('checkout.standardShippingDesc')}</p>
          </div>
          <span className="font-semibold text-emerald-600">
            {t('checkout.standardShippingPrice')}
          </span>
        </Label>

        {/* Express shipping */}
        <Label
          htmlFor="express"
          className={cn(
            'flex cursor-pointer items-center gap-4 rounded-lg border border-border p-4 transition-all',
            selected === 'express' && 'ring-2 ring-brand-navy',
          )}
        >
          <RadioGroupItem value="express" id="express" />
          <Zap className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{t('checkout.expressShipping')}</p>
            <p className="text-sm text-muted-foreground">{t('checkout.expressShippingDesc')}</p>
          </div>
          <span className="font-semibold">{t('checkout.expressShippingPrice')}</span>
        </Label>
      </RadioGroup>
    </div>
  );
}
