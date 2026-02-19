import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

export async function SectionDivider() {
  const t = await getTranslations('storefront');

  return (
    <div
      data-slot="section-divider"
      className={cn('w-full bg-brand-navy px-8 py-3 text-center text-base font-bold text-white')}
    >
      {t('sectionDivider.text')}
    </div>
  );
}
