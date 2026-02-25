import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function SectionDivider() {
  const t = await getTranslations('catalog');

  return (
    <div
      data-slot="section-divider"
      className={cn(
        'flex h-12 w-full items-center justify-center bg-brand-navy text-base font-bold text-white',
      )}
    >
      {t('sectionDivider.text')}
    </div>
  );
}
