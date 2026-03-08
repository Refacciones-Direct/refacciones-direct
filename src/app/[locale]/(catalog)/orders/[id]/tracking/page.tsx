import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/shared/container';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { SiteFooter } from '@/components/catalog/site-footer';
import { TrackingTimeline } from '@/components/catalog/orders/tracking-timeline';
import { TrackingItemsCard } from '@/components/catalog/orders/tracking-items-card';

export default async function OrderTrackingPage({
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
      <CategoryNav />
      <main>
        <Container className="py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('orders.trackingTitle')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('orders.orderNumber')}:{' '}
                <span className="font-semibold text-brand-navy">{id}</span> · {t('orders.placed')}:
                5 de marzo, 2026
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-10">
            <div className="lg:col-span-7">
              <TrackingTimeline />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <TrackingItemsCard />
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full">
                  {t('orders.contactSupport')}
                </Button>
                <Button variant="outline" className="w-full">
                  {t('orders.returnOrExchange')}
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
