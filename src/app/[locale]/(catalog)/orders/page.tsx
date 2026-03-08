import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/shared/container';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { SiteFooter } from '@/components/catalog/site-footer';
import { OrderFilters } from '@/components/catalog/orders/order-filters';
import { OrderCard } from '@/components/catalog/orders/order-card';
import { MOCK_ORDERS } from '@/data/mock-demo';

export default async function MyOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('catalog');

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main>
        <Container className="py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
          </div>
          <div className="mt-4">
            <OrderFilters />
          </div>
          <div className="mt-6 space-y-4">
            {MOCK_ORDERS.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
