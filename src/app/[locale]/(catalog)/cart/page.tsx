import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { SiteFooter } from '@/components/catalog/site-footer';
import { Container } from '@/components/shared/container';
import { CartItemList } from '@/components/catalog/cart/cart-item-list';
import { OrderSummary } from '@/components/catalog/checkout/order-summary';
import { MOCK_CART } from '@/data/mock-demo';

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('catalog');

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main>
        <Container className="py-8">
          <h1 className="text-2xl font-bold">
            {t('cart.title')}{' '}
            <span className="text-lg font-normal text-muted-foreground">
              {t('cart.itemCount', { count: MOCK_CART.items.length })}
            </span>
          </h1>
          <div className="mt-6 grid gap-8 lg:grid-cols-10">
            <div className="lg:col-span-7">
              <CartItemList />
            </div>
            <div className="lg:col-span-3">
              <OrderSummary
                subtotal={MOCK_CART.subtotal}
                shipping={MOCK_CART.shipping}
                tax={MOCK_CART.tax}
                total={MOCK_CART.total}
                showCheckoutButton
              />
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
