import { CreditCard, MapPin, Truck } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SiteHeader } from '@/components/catalog/site-header';
import { SiteFooter } from '@/components/catalog/site-footer';
import { Container } from '@/components/shared/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckoutProgressBar } from '@/components/catalog/checkout/progress-bar';
import { ReviewContent } from '@/components/catalog/checkout/review-content';
import { MOCK_SHIPPING_ADDRESS } from '@/data/mock-demo';

export default async function CheckoutReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('catalog');

  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-8">
          <CheckoutProgressBar currentStep={3} />
          {/* Summary cards — equal height row */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {/* Shipping address */}
            <Card className="gap-2 py-4">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{t('checkout.shippingAddress')}</CardTitle>
                  </div>
                  <Link
                    href="/checkout/shipping"
                    className="text-sm font-medium text-brand-navy hover:underline"
                  >
                    {t('checkout.edit')}
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{MOCK_SHIPPING_ADDRESS.name}</p>
                <p className="text-muted-foreground">
                  {MOCK_SHIPPING_ADDRESS.street} {MOCK_SHIPPING_ADDRESS.extNumber}
                  {MOCK_SHIPPING_ADDRESS.intNumber && ` Int. ${MOCK_SHIPPING_ADDRESS.intNumber}`}
                </p>
                <p className="text-muted-foreground">
                  {MOCK_SHIPPING_ADDRESS.colonia}, {MOCK_SHIPPING_ADDRESS.municipio}
                </p>
                <p className="text-muted-foreground">
                  {MOCK_SHIPPING_ADDRESS.state} {MOCK_SHIPPING_ADDRESS.zip}
                </p>
                <p className="text-muted-foreground">{MOCK_SHIPPING_ADDRESS.phone}</p>
              </CardContent>
            </Card>

            {/* Delivery method */}
            <Card className="gap-2 py-4">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{t('checkout.deliveryMethod')}</CardTitle>
                  </div>
                  <Link
                    href="/checkout/shipping"
                    className="text-sm font-medium text-brand-navy hover:underline"
                  >
                    {t('checkout.edit')}
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{t('checkout.standardShipping')}</p>
                <p className="text-muted-foreground">{t('checkout.standardShippingDesc')}</p>
                <p className="font-medium text-emerald-600">
                  {t('checkout.standardShippingPrice')}
                </p>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card className="gap-2 py-4">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{t('checkout.paymentTitle')}</CardTitle>
                  </div>
                  <Link
                    href="/checkout/payment"
                    className="text-sm font-medium text-brand-navy hover:underline"
                  >
                    {t('checkout.edit')}
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{t('review.cardEnding', { last4: '4242' })}</p>
                <p className="text-muted-foreground">Juan García López</p>
              </CardContent>
            </Card>
          </div>

          {/* Items + Order Summary — reads from cart context */}
          <div className="mt-8 grid gap-8 lg:grid-cols-10">
            <ReviewContent />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
