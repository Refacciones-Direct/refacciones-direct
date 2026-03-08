import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/shared/container';
import { Carousel } from '@/components/shared/carousel';
import { SearchProductCard } from './search-product-card';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '@/data/mock-demo';

export async function FeaturedProducts() {
  const t = await getTranslations('catalog');

  // Pick the second product from each category for a different selection
  const featured = MOCK_CATEGORIES.map((cat) => {
    const products = MOCK_PRODUCTS.filter((p) => p.categorySlug === cat.slug);
    return products[1] ?? products[0];
  });

  const cards = featured.map((product) => (
    <div key={product.id} className="shrink-0 snap-start max-xl:w-52 xl:w-auto">
      <SearchProductCard
        id={product.id}
        name={product.name}
        brand={product.brand}
        sku={product.sku}
        price={product.price}
        currency={product.currency}
        imageUrl={product.imageUrl}
        category={product.category}
      />
    </div>
  ));

  return (
    <section data-slot="featured-products" className="bg-bg-light py-8">
      <Container className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">{t('featuredProducts.title')}</h2>

        {/* Grid on wide screens */}
        <div className="hidden grid-cols-6 gap-4 xl:grid">{cards}</div>

        {/* Carousel on narrower screens */}
        <Carousel className="xl:hidden" gap={12} ariaLabel={t('featuredProducts.title')}>
          {cards}
        </Carousel>
      </Container>
    </section>
  );
}
