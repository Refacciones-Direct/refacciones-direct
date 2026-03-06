import { getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/components/catalog/site-header';
import { SiteFooter } from '@/components/catalog/site-footer';
import { Container } from '@/components/shared/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckoutProgressBar } from '@/components/catalog/checkout/progress-bar';
import { PaymentForm } from '@/components/catalog/checkout/payment-form';
import { OrderSummary } from '@/components/catalog/checkout/order-summary';
import { MOCK_CART, MOCK_SHIPPING_ADDRESS } from '@/data/mock-demo';

export default async function CheckoutPaymentPage({
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
          <CheckoutProgressBar currentStep={2} />
          <div className="mt-8 grid gap-8 lg:grid-cols-10">
            <div className="lg:col-span-7">
              <PaymentForm />
            </div>
            <div className="space-y-4 lg:col-span-3">
              <OrderSummary
                subtotal={MOCK_CART.subtotal}
                shipping={MOCK_CART.shipping}
                tax={MOCK_CART.tax}
                total={MOCK_CART.total}
              />
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{t('checkout.shippingAddress')}</CardTitle>
                    <span className="text-sm text-brand-navy hover:underline">
                      {t('checkout.edit')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="font-medium">{MOCK_SHIPPING_ADDRESS.name}</p>
                  <p className="text-muted-foreground">{MOCK_SHIPPING_ADDRESS.street}</p>
                  <p className="text-muted-foreground">
                    {MOCK_SHIPPING_ADDRESS.city}, {MOCK_SHIPPING_ADDRESS.state}{' '}
                    {MOCK_SHIPPING_ADDRESS.zip}
                  </p>
                  <p className="text-muted-foreground">{MOCK_SHIPPING_ADDRESS.phone}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
