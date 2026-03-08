'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from '@/i18n/navigation';
import { useVehicleContext } from '@/hooks/use-vehicle-context';
import { useVehicleOptions } from '@/hooks/use-vehicle-options';

interface VehicleSelectorProps {
  className?: string;
}

export function VehicleSelector({ className }: VehicleSelectorProps) {
  const t = useTranslations('catalog');
  const router = useRouter();
  const { setVehicle } = useVehicleContext();

  const {
    makes,
    models,
    years,
    selectedMake,
    selectedModel,
    selectedYear,
    loadingMakes,
    loadingModels,
    loadingYears,
    isReady,
    selectMake,
    selectModel,
    selectYear,
  } = useVehicleOptions();

  function handleSearch() {
    if (!isReady) return;
    const year = parseInt(selectedYear, 10);
    setVehicle({ make: selectedMake, model: selectedModel, year });
    router.push(
      `/search?make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&year=${year}`,
    );
  }

  return (
    <div
      data-slot="vehicle-selector"
      className={cn('rounded-lg border border-border bg-card p-6 shadow', className)}
    >
      <h2 className="text-center text-lg font-semibold">{t('vehicleSelector.title')}</h2>

      <div className="mt-5 flex flex-col gap-4">
        {/* Make */}
        <Select value={selectedMake} onValueChange={selectMake} disabled={loadingMakes}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loadingMakes ? t('vehicleSelector.loading') : t('vehicleSelector.makePlaceholder')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {makes.map((make) => (
              <SelectItem key={make} value={make}>
                {make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Model */}
        <Select
          value={selectedModel}
          onValueChange={selectModel}
          disabled={!selectedMake || loadingModels}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loadingModels ? t('vehicleSelector.loading') : t('vehicleSelector.modelPlaceholder')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year */}
        <Select
          value={selectedYear}
          onValueChange={selectYear}
          disabled={!selectedModel || loadingYears}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loadingYears ? t('vehicleSelector.loading') : t('vehicleSelector.yearPlaceholder')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search button */}
        <Button className="w-full" disabled={!isReady} onClick={handleSearch}>
          {t('vehicleSelector.searchButton')}
        </Button>
      </div>
    </div>
  );
}
