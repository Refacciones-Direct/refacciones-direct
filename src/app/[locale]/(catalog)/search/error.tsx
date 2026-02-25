'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function SearchError({ reset }: { reset: () => void }) {
  const t = useTranslations('catalog');

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold">{t('search.error.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('search.error.description')}</p>
      <Button variant="outline" onClick={reset}>
        {t('search.error.retry')}
      </Button>
    </div>
  );
}
