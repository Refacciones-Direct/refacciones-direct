import { BadgeCheck, BookOpen, Package, Wrench } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

const VALUE_PROPS = [
  { icon: BadgeCheck, titleKey: 'vp1Title', subKey: 'vp1Sub' },
  { icon: Wrench, titleKey: 'vp2Title', subKey: 'vp2Sub' },
  { icon: BookOpen, titleKey: 'vp3Title', subKey: 'vp3Sub' },
  { icon: Package, titleKey: 'vp4Title', subKey: 'vp4Sub' },
] as const;

export async function ValueProps() {
  const t = await getTranslations('storefront');

  return (
    <section data-slot="value-props" className={cn('h-20 bg-bg-section')}>
      <div className="mx-auto flex h-full max-w-7xl items-center justify-around px-4">
        {VALUE_PROPS.map(({ icon: Icon, titleKey, subKey }) => (
          <div key={titleKey} className="flex items-center gap-3">
            <Icon className="size-7 shrink-0 text-brand-blue" />
            <div className="flex flex-col">
              <span className="text-xs font-bold italic uppercase text-brand-blue">
                {t(`valueProps.${titleKey}`)}
              </span>
              <span className="text-sm uppercase text-brand-blue">
                {t(`valueProps.${subKey}`)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
