import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/shared/container';
import { Carousel } from '@/components/shared/carousel';

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

  const logos = BRANDS.map((brand) => (
    <span
      key={brand.name}
      className="flex h-20 w-40 shrink-0 snap-start items-center justify-center rounded-lg border border-border bg-white p-3 transition-shadow hover:shadow-md"
    >
      <img src={brand.logo} alt={brand.name} className="max-h-full max-w-full object-contain" />
    </span>
  ));

  return (
    <section data-slot="brand-logos" className="py-8" aria-label={t('manufacturers.title')}>
      <Container className="flex flex-col items-center gap-5">
        <h2 className="text-xl font-bold">{t('manufacturers.title')}</h2>

        {/* Wrap row on wide screens (6 logos need ~1080px) */}
        <div className="hidden flex-wrap items-center justify-center gap-6 xl:flex">{logos}</div>

        {/* Carousel on narrower screens */}
        <Carousel className="w-full xl:hidden" gap={16} ariaLabel={t('manufacturers.title')}>
          {logos}
        </Carousel>
      </Container>
    </section>
  );
}
