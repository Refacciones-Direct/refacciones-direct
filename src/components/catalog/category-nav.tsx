'use client';

import { useState } from 'react';
import { Car, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useVehicleContext } from '@/hooks/use-vehicle-context';
import { VehicleSidebar } from '@/components/catalog/vehicle-sidebar';

export function CategoryNav() {
  const t = useTranslations('catalog');
  const { vehicle } = useVehicleContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null;

  return (
    <>
      <nav data-slot="category-nav" className="bg-brand-navy text-sm font-medium text-white">
        <div className="mx-auto flex h-11 max-w-7xl items-center gap-5 px-4 md:px-8 lg:px-20">
          {/* Vehicle button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/10"
          >
            <Car className="size-5" />
            <span>{vehicleLabel ?? t('categoryNav.addVehicle')}</span>
            <ChevronRight className="size-4 opacity-70" />
          </button>
        </div>
      </nav>

      <VehicleSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
