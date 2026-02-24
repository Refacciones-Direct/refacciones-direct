import { ArrowUpDown, BatteryCharging, Cog, Disc, Filter, Lightbulb } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { CategoryListCard } from './category-list-card';

const categories = [
  { key: 'cat1', icon: Cog },
  { key: 'cat2', icon: Filter },
  { key: 'cat3', icon: ArrowUpDown },
  { key: 'cat4', icon: BatteryCharging },
  { key: 'cat5', icon: Lightbulb },
  { key: 'cat6', icon: Disc },
] as const;

export async function CategoryGrid() {
  const t = await getTranslations('catalog');

  const row1 = categories.slice(0, 3);
  const row2 = categories.slice(3, 6);

  return (
    <section data-slot="category-grid" className={cn('py-6')}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4">
        <div className="flex gap-6 *:flex-1">
          {row1.map(({ key, icon: Icon }) => (
            <CategoryListCard
              key={key}
              title={t(`categories.${key}.title`)}
              icon={<Icon className="size-8" />}
              links={t.raw(`categories.${key}.links`) as string[]}
              viewMoreText={t('categories.viewMore')}
            />
          ))}
        </div>
        <div className="flex gap-6 *:flex-1">
          {row2.map(({ key, icon: Icon }) => (
            <CategoryListCard
              key={key}
              title={t(`categories.${key}.title`)}
              icon={<Icon className="size-8" />}
              links={t.raw(`categories.${key}.links`) as string[]}
              viewMoreText={t('categories.viewMore')}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
