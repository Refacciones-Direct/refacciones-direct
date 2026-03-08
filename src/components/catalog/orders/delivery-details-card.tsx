import { CalendarDays, MapPin, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MOCK_SHIPPING_ADDRESS } from '@/data/mock-demo';

export async function DeliveryDetailsCard() {
  const t = await getTranslations('catalog');

  return (
    <Card data-slot="delivery-details-card">
      <CardHeader>
        <CardTitle>{t('confirmation.deliveryDetails')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-3">
        <div className="flex gap-3">
          <Truck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('confirmation.deliveryMethod')}
            </p>
            <p className="mt-1 text-sm font-semibold">Envío estándar</p>
          </div>
        </div>
        <div className="flex gap-3">
          <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('confirmation.estimatedDelivery')}
            </p>
            <p className="mt-1 text-sm font-semibold">{t('confirmation.estimatedDate')}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t('confirmation.shippingAddress')}
            </p>
            <div className="mt-1 space-y-0.5 text-sm font-semibold">
              <p>{MOCK_SHIPPING_ADDRESS.name}</p>
              <p className="font-normal text-muted-foreground">{MOCK_SHIPPING_ADDRESS.street}</p>
              <p className="font-normal text-muted-foreground">
                {MOCK_SHIPPING_ADDRESS.city}, {MOCK_SHIPPING_ADDRESS.state}{' '}
                {MOCK_SHIPPING_ADDRESS.zip}
              </p>
              <p className="font-normal text-muted-foreground">{MOCK_SHIPPING_ADDRESS.phone}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
