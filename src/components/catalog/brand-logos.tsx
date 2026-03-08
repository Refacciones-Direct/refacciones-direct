import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Container } from '@/components/shared/container';

const BRANDS = [
  { name: 'DURALAST', logo: '/images/duralast logo.png' },
  { name: 'MANN-FILTER', logo: '/images/mann filter logo.png' },
  { name: 'BOSCH', logo: '/images/Bosch-logo.svg.png' },
  { name: 'GATES', logo: '/images/GatesCorporation_Logo.svg' },
  { name: 'HELLA', logo: '/images/hella logo.jpg' },
  { name: 'MONROE', logo: '/images/monroe logo.png' },
] as const;

export async function BrandLogos() {
  const t = await getTranslations('catalog');

  return (
    <section data-slot="brand-logos" className={cn('py-8')} aria-label={t('manufacturers.title')}>
      <Container className="flex flex-col items-center gap-5">
        <h2 className="text-xl font-bold">{t('manufacturers.title')}</h2>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {BRANDS.map((brand) => (
            <span
              key={brand.name}
              className="flex h-20 w-40 items-center justify-center rounded-lg border border-border bg-white p-3 transition-shadow hover:shadow-md"
            >
              <img
                src={brand.logo}
                alt={brand.name}
                className="max-h-full max-w-full object-contain"
              />
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
