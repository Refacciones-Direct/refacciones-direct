'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type FilterValue = 'all' | 'processing' | 'delivered';

interface FilterOption {
  value: FilterValue;
  labelKey: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', labelKey: 'orders.filterAll' },
  { value: 'processing', labelKey: 'orders.filterProcessing' },
  { value: 'delivered', labelKey: 'orders.filterDelivered' },
];

export function OrderFilters() {
  const t = useTranslations('catalog');
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');

  return (
    <div data-slot="order-filters" className="flex gap-2">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setActiveFilter(option.value)}
          className={cn(
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
            activeFilter === option.value
              ? 'bg-brand-navy text-white'
              : 'border border-border bg-background text-muted-foreground hover:bg-muted',
          )}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );
}
