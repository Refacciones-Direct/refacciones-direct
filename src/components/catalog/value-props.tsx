import { Factory, Headset, ShieldCheck, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Container } from '@/components/shared/container';

const VALUE_PROPS = [
  { icon: Factory, titleKey: 'vp1Title', subKey: 'vp1Sub' },
  { icon: ShieldCheck, titleKey: 'vp2Title', subKey: 'vp2Sub' },
  { icon: Truck, titleKey: 'vp3Title', subKey: 'vp3Sub' },
  { icon: Headset, titleKey: 'vp4Title', subKey: 'vp4Sub' },
] as const;

export async function ValueProps() {
  const t = await getTranslations('catalog');

  return (
    <section data-slot="value-props" className={cn('h-20 bg-bg-section')}>
      <Container className="flex h-full items-center justify-around">
        {VALUE_PROPS.map(({ icon: Icon, titleKey, subKey }) => (
          <div key={titleKey} className="flex items-center gap-3">
            <Icon className="size-7 shrink-0 text-brand-blue" />
            <div className="flex flex-col">
              <span className="text-sm font-bold italic uppercase text-brand-blue">
                {t(`valueProps.${titleKey}`)}
              </span>
              <span className="text-sm uppercase text-brand-blue">{t(`valueProps.${subKey}`)}</span>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}
