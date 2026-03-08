'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MEXICAN_STATES = [
  'CDMX',
  'Estado de México',
  'Jalisco',
  'Nuevo León',
  'Puebla',
  'Querétaro',
  'Guanajuato',
];

export function ShippingForm() {
  const t = useTranslations('catalog');

  return (
    <div data-slot="shipping-form" className="space-y-6">
      <h2 className="text-xl font-bold">{t('checkout.shippingTitle')}</h2>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t('checkout.firstName')}</Label>
          <Input id="firstName" defaultValue="Juan" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t('checkout.lastName')}</Label>
          <Input id="lastName" defaultValue="García López" />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">{t('checkout.address')}</Label>
        <Input id="address" defaultValue="Av. Revolución 1425, Col. Mixcoac" />
      </div>

      {/* City / State / Zip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">{t('checkout.city')}</Label>
          <Input id="city" defaultValue="Ciudad de México" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">{t('checkout.state')}</Label>
          <Select defaultValue="CDMX">
            <SelectTrigger id="state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEXICAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">{t('checkout.zipCode')}</Label>
          <Input id="zipCode" defaultValue="03910" />
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">{t('checkout.phone')}</Label>
        <Input id="phone" defaultValue="+52 55 1234 5678" />
      </div>

      {/* Save address */}
      <div className="flex items-center gap-2">
        <Checkbox id="saveAddress" />
        <Label htmlFor="saveAddress" className="cursor-pointer font-normal">
          {t('checkout.saveAddress')}
        </Label>
      </div>
    </div>
  );
}
