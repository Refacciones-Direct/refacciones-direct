'use client';

import { CircleCheck, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVehicleContext } from '@/hooks/use-vehicle-context';

export function FitmentBadge() {
  const t = useTranslations('catalog');
  const { vehicle } = useVehicleContext();

  if (vehicle) {
    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    return (
      <div
        data-slot="fitment-badge"
        className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      >
        <CircleCheck className="size-4 shrink-0" />
        <span>{t('pdp.fitmentCompatible', { vehicle: vehicleLabel })}</span>
      </div>
    );
  }

  return (
    <div
      data-slot="fitment-badge"
      className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
    >
      <Info className="size-4 shrink-0" />
      <span>{t('pdp.fitmentCheck')}</span>
    </div>
  );
}
