import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { SiteFooter } from '@/components/catalog/site-footer';
import { Container } from '@/components/shared/container';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { ProductGallery } from '@/components/catalog/pdp/product-gallery';
import { ProductInfo } from '@/components/catalog/pdp/product-info';
import { ProductTabs } from '@/components/catalog/pdp/product-tabs';
import { MOCK_PRODUCTS } from '@/data/mock-demo';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const product = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!product) notFound();

  const t = await getTranslations('catalog');

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main>
        <Container className="py-6">
          <Breadcrumbs
            items={[
              { label: t('pdp.home'), href: '/' },
              { label: product.category, href: '/search' },
              { label: product.name },
            ]}
          />
          <div className="mt-6 grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ProductGallery imageUrl={product.imageUrl} />
            </div>
            <div className="lg:col-span-2">
              <ProductInfo product={product} />
            </div>
          </div>
        </Container>
        <Container className="py-8">
          <ProductTabs product={product} />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
