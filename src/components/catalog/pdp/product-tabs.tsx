'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MockProduct } from '@/data/mock-demo';

interface ProductTabsProps {
  product: MockProduct;
}

export function ProductTabs({ product }: ProductTabsProps) {
  const t = useTranslations('catalog');

  return (
    <Tabs data-slot="product-tabs" defaultValue="specs">
      <TabsList variant="line">
        <TabsTrigger value="specs">{t('pdp.tabSpecs')}</TabsTrigger>
        <TabsTrigger value="fitment">{t('pdp.tabFitment')}</TabsTrigger>
        <TabsTrigger value="reviews">{t('pdp.tabReviews')}</TabsTrigger>
      </TabsList>

      {/* Specifications */}
      <TabsContent value="specs" className="pt-4">
        <h3 className="mb-3 text-lg font-semibold">{t('pdp.specsTitle')}</h3>
        <table className="w-full text-sm">
          <tbody>
            {product.specifications.map((spec, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-muted/50' : ''}>
                <td className="px-3 py-2 font-medium text-muted-foreground">{spec.label}</td>
                <td className="px-3 py-2">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabsContent>

      {/* Fitment / Compatibility */}
      <TabsContent value="fitment" className="pt-4">
        <h3 className="mb-3 text-lg font-semibold">{t('pdp.fitmentTitle')}</h3>
        <ul className="space-y-2 text-sm">
          {product.fitmentVehicles.map((vehicle, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {vehicle}
            </li>
          ))}
        </ul>
      </TabsContent>

      {/* Reviews */}
      <TabsContent value="reviews" className="pt-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            {t('pdp.tabReviews')} - Coming soon
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pdp.reviews', { count: product.reviewCount })}
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
