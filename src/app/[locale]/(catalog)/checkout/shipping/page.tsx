import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SiteHeader } from '@/components/catalog/site-header';
import { SiteFooter } from '@/components/catalog/site-footer';
import { Container } from '@/components/shared/container';
import { Button } from '@/components/ui/button';
import { CheckoutProgressBar } from '@/components/catalog/checkout/progress-bar';
import { ShippingForm } from '@/components/catalog/checkout/shipping-form';
import { DeliveryMethodPicker } from '@/components/catalog/checkout/delivery-method-picker';
import { OrderSummary } from '@/components/catalog/checkout/order-summary';
import { MOCK_CART } from '@/data/mock-demo';

export default async function CheckoutShippingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getTranslations('catalog');

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-8">
          <CheckoutProgressBar currentStep={1} />
          <div className="mt-8 grid gap-8 lg:grid-cols-10">
            <div className="space-y-8 lg:col-span-7">
              <ShippingForm />
              <DeliveryMethodPicker />
              <Link href="/checkout/payment">
                <Button
                  className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark"
                  size="lg"
                >
                  {t('checkout.continueToPayment')}
                </Button>
              </Link>
            </div>
            <div className="lg:col-span-3">
              <OrderSummary
                subtotal={MOCK_CART.subtotal}
                shipping={MOCK_CART.shipping}
                tax={MOCK_CART.tax}
                total={MOCK_CART.total}
              />
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
