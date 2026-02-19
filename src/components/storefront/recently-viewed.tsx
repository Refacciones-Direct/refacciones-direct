import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';

const MOCK_PRODUCTS = [
  { name: 'Filtro de aceite', reference: 'MANN-FILTER - W 712/95' },
  { name: 'Radiador, refrigeraci\u00f3n del...', reference: 'NISSENS - 61017' },
  { name: 'Pastillas de freno', reference: 'BREMBO - P 85 020' },
  { name: 'Buj\u00eda de encendido', reference: 'NGK - BKR6E' },
];

export async function RecentlyViewed() {
  const t = await getTranslations('storefront');

  return (
    <section data-slot="recently-viewed" className={cn('py-6')}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4">
        <h2 className="text-lg font-semibold">{t('recentlyViewed.title')}</h2>

        <div className="flex gap-4">
          {MOCK_PRODUCTS.map((product) => (
            <ProductCard
              key={product.reference}
              name={product.name}
              reference={product.reference}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
