import { ChevronDown, Tag } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const CATEGORY_KEYS = ['refacciones', 'aceite', 'llantas', 'accesorios', 'herramientas'] as const;

export async function CategoryNav() {
  const t = await getTranslations('catalog');

  return (
    <nav data-slot="category-nav" className={cn('bg-brand-navy text-sm font-medium text-white')}>
      <div className="mx-auto flex h-11 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-1">
          {CATEGORY_KEYS.map((key) => (
            <Link
              key={key}
              href="/"
              className="flex items-center gap-1 rounded px-3 py-1.5 hover:bg-white/10"
            >
              <span>{t(`categoryNav.${key}`)}</span>
              <ChevronDown className="size-3.5 opacity-70" />
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-bright-yellow hover:text-bright-yellow/80"
        >
          <Tag className="size-3.5" />
          <span className="font-semibold">{t('categoryNav.ofertas')}</span>
        </Link>
      </div>
    </nav>
  );
}
