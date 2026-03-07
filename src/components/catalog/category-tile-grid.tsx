import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/shared/container';

const CATEGORY_TILES = [
  { slug: 'frenado', image: '/images/brakepads.jpg', labelKey: 'cat6' },
  {
    slug: 'filtros',
    image: '/images/aspectos-tener-en-cuenta-para-elegir-un-filtro-de-aceite-adecuado.jpg',
    labelKey: 'cat2',
  },
  { slug: 'motor', image: '/images/piezas-de-motor.jpg', labelKey: 'cat1' },
  { slug: 'arranque', image: '/images/car-batteries.jpg', labelKey: 'cat4' },
  { slug: 'opticas', image: '/images/car-headlights.jpg', labelKey: 'cat5' },
  { slug: 'suspension', image: '/images/car-suspension.jpg', labelKey: 'cat3' },
] as const;

export async function CategoryTileGrid() {
  const t = await getTranslations('catalog');

  return (
    <section data-slot="category-tiles" className="py-8">
      <Container className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">{t('homepage.shopByCategory')}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_TILES.map(({ slug, image, labelKey }) => (
            <Link
              key={slug}
              href={`/category/${slug}`}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-4/3">
                <Image
                  src={image}
                  alt={t(`categories.${labelKey}.title`)}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              </div>
              <span className="block p-3 text-center text-sm font-semibold">
                {t(`categories.${labelKey}.title`)}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
