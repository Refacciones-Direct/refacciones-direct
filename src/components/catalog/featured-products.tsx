import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/shared/container';
import { SearchProductCard } from './search-product-card';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '@/data/mock-demo';

export async function FeaturedProducts() {
  const t = await getTranslations('catalog');

  // Pick the second product from each category for a different selection
  const featured = MOCK_CATEGORIES.map((cat) => {
    const products = MOCK_PRODUCTS.filter((p) => p.categorySlug === cat.slug);
    return products[1] ?? products[0];
  });

  return (
    <section data-slot="featured-products" className="bg-bg-light py-8">
      <Container className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">{t('featuredProducts.title')}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {featured.map((product) => (
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
    </section>
  );
}
