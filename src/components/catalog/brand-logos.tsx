import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Container } from '@/components/shared/container';

const MANUFACTURERS = ['Fabricante 1', 'Fabricante 2', 'Fabricante 3'] as const;

export async function BrandLogos() {
  const t = await getTranslations('catalog');

  return (
    <section
      data-slot="brand-logos"
      className={cn('bg-card py-8')}
      aria-label={t('manufacturers.title')}
    >
      <Container className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-semibold">{t('manufacturers.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('manufacturers.subtitle')}</p>

        <div className="flex items-center gap-8">
          {MANUFACTURERS.map((mfg) => (
            <span
              key={mfg}
              className="flex h-14 w-36 items-center justify-center rounded bg-bg-light text-sm font-bold text-foreground"
            >
              {mfg}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
