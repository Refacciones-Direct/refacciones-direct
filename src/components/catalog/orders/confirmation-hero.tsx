import { CircleCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface ConfirmationHeroProps {
  orderId: string;
}

export async function ConfirmationHero({ orderId }: ConfirmationHeroProps) {
  const t = await getTranslations('catalog');

  return (
    <div data-slot="confirmation-hero" className="flex flex-col items-center text-center">
      <div className="flex size-[72px] items-center justify-center rounded-full bg-emerald-50">
        <CircleCheck className="size-10 text-emerald-600" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">{t('confirmation.title')}</h1>
      <p className="mt-2 max-w-md text-center text-muted-foreground">
        {t('confirmation.subtitle')}
      </p>
      <div className="mt-6 rounded-lg bg-muted px-5 py-3">
        <span className="text-sm text-muted-foreground">{t('confirmation.orderNumber')}:</span>{' '}
        <span className="font-bold">{orderId}</span>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t('confirmation.emailNote')}
      </p>
    </div>
  );
}
