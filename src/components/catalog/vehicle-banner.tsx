'use client';

import { Car } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { useVehicleContext } from '@/hooks/use-vehicle-context';

export function VehicleBanner() {
  const t = useTranslations('catalog');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { vehicle, clearVehicle } = useVehicleContext();

  if (!vehicle) return null;

  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  function handleClearVehicle() {
    clearVehicle();
    // Re-navigate without vehicle params, keep text query + sort
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    const sort = searchParams.get('sort');
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex w-full items-center justify-between border-t-2 border-primary bg-accent px-4 py-3 sm:px-20">
      <div className="flex items-center gap-3">
        <Car className="size-5 shrink-0 text-primary" />
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          {t('vehicleBanner.shoppingFor')}
        </span>
        <span className="text-sm font-semibold">{vehicleLabel}</span>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="text-xs" onClick={() => router.push('/')}>
          {t('vehicleBanner.changeVehicle')}
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground underline hover:text-foreground"
          onClick={handleClearVehicle}
        >
          {t('vehicleBanner.searchWithout')}
        </button>
      </div>
    </div>
  );
}
