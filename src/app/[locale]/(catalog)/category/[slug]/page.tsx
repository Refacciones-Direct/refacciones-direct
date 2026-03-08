import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { SiteFooter } from '@/components/catalog/site-footer';
import { Container } from '@/components/shared/container';
import { SearchProductCard } from '@/components/catalog/search-product-card';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '@/data/mock-demo';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const category = MOCK_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const products = MOCK_PRODUCTS.filter((p) => p.categorySlug === slug);

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main>
        <Container className="py-8">
          <h1 className="text-2xl font-bold">{category.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <SearchProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                brand={product.brand}
                sku={product.sku}
                price={product.price}
                currency={product.currency}
                imageUrl={product.imageUrl}
                category={product.category}
              />
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
