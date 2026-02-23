import { Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export async function PromoBanner() {
  const t = await getTranslations('catalog');

  return (
    <div
      data-slot="promo-banner"
      className={cn('w-full bg-brand-red text-base font-semibold text-white')}
    >
      <div className="mx-auto flex h-[52px] max-w-7xl items-center justify-center gap-3 px-4">
        <Truck className="size-4 shrink-0" />
        <span>{t('promoBanner.text')}</span>
        <Link
          href="/"
          className="rounded border-2 border-white px-2.5 py-0.5 text-xs font-medium hover:bg-white/10"
        >
          {t('promoBanner.link')}
        </Link>
      </div>
    </div>
  );
}
