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
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    const sort = searchParams.get('sort');
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="border-t-4 border-primary bg-accent px-4 py-6 shadow-sm sm:px-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left: icon box + stacked label/vehicle */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden size-18 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
            <Car className="size-10 text-primary" />
          </div>
          <Car className="size-8 shrink-0 text-primary sm:hidden" />
          <div className="flex flex-col gap-0.75">
            <span className="text-xs font-bold tracking-[1.2px] text-foreground">
              {t('vehicleBanner.shoppingFor')}
            </span>
            <span className="text-base font-bold sm:text-lg">{vehicleLabel}</span>
          </div>
        </div>

        {/* Right: stacked actions */}
        <div className="flex flex-col items-center justify-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-sm text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => router.push('/')}
          >
            {t('vehicleBanner.changeVehicle')}
          </Button>
          <button
            type="button"
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
            onClick={handleClearVehicle}
          >
            {t('vehicleBanner.searchWithout')}
          </button>
        </div>
      </div>
    </div>
  );
}
