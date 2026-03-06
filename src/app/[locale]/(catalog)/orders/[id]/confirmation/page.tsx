import { Info } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/shared/container';
import { SiteHeader } from '@/components/catalog/site-header';
import { SiteFooter } from '@/components/catalog/site-footer';
import { ConfirmationHero } from '@/components/catalog/orders/confirmation-hero';
import { DeliveryDetailsCard } from '@/components/catalog/orders/delivery-details-card';
import { OrderSummaryCard } from '@/components/catalog/orders/order-summary-card';

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('catalog');

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="max-w-3xl py-12">
          <div className="flex flex-col items-center gap-8">
            <ConfirmationHero orderId={id} />

            <div className="w-full space-y-6">
              <DeliveryDetailsCard />
              <OrderSummaryCard />
            </div>

            <div className="flex gap-4">
              <Button className="bg-brand-navy text-white hover:bg-brand-navy-dark" asChild>
                <Link href={`/orders/${id}/tracking`}>{t('confirmation.trackOrder')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">{t('confirmation.continueShopping')}</Link>
              </Button>
            </div>

            <Card className="w-full">
              <CardContent className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-brand-navy" />
                <div>
                  <p className="text-sm font-semibold">{t('confirmation.whatsNext')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('confirmation.whatsNextDesc')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
