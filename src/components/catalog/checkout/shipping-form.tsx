'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MEXICAN_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'CDMX',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
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

      {/* Street + Numbers */}
      <div className="space-y-2">
        <Label htmlFor="street">{t('checkout.street')}</Label>
        <Input id="street" defaultValue="Av. Revolución" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="extNumber">{t('checkout.extNumber')}</Label>
          <Input id="extNumber" defaultValue="1425" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intNumber">
            {t('checkout.intNumber')}{' '}
            <span className="font-normal text-muted-foreground">({t('checkout.optional')})</span>
          </Label>
          <Input id="intNumber" placeholder={t('checkout.intNumberPlaceholder')} />
        </div>
      </div>

      {/* Colonia + CP */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="colonia">{t('checkout.colonia')}</Label>
          <Input id="colonia" defaultValue="Mixcoac" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">{t('checkout.zipCode')}</Label>
          <Input id="zipCode" defaultValue="03910" inputMode="numeric" maxLength={5} />
        </div>
      </div>

      {/* Municipio / State */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="municipio">{t('checkout.municipio')}</Label>
          <Input id="municipio" defaultValue="Benito Juárez" />
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
      </div>

      {/* Delivery references */}
      <div className="space-y-2">
        <Label htmlFor="references">
          {t('checkout.references')}{' '}
          <span className="font-normal text-muted-foreground">({t('checkout.optional')})</span>
        </Label>
        <Textarea id="references" rows={2} placeholder={t('checkout.referencesPlaceholder')} />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">{t('checkout.phone')}</Label>
        <Input id="phone" type="tel" defaultValue="+52 55 1234 5678" />
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
