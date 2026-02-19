import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

const BRANDS = ['BOSCH', 'brembo', 'MANN', 'Valeo', 'Continental', 'Castrol'] as const;

export async function BrandLogos() {
  const t = await getTranslations('storefront');

  return (
    <section data-slot="brand-logos" className={cn('bg-card')} aria-label={t('brands.title')}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-center gap-8 px-4">
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border hover:bg-accent"
          aria-label={t('brands.previous')}
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-8">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="flex h-12 w-30 items-center justify-center rounded bg-bg-light text-base font-bold text-foreground"
            >
              {brand}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border hover:bg-accent"
          aria-label={t('brands.next')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </section>
  );
}
