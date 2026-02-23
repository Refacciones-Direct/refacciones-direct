'use client';

import { useEffect, useRef, useState } from 'react';
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
import type {
  VehicleOptionsMakes,
  VehicleOptionsModels,
  VehicleOptionsYears,
} from '@/services/search/types';

interface VehicleSelectorProps {
  className?: string;
}

async function fetchMakes(): Promise<string[]> {
  const res = await fetch('/api/public/vehicle-options');
  const data: VehicleOptionsMakes = await res.json();
  return data.makes ?? [];
}

async function fetchModels(make: string): Promise<string[]> {
  const res = await fetch(`/api/public/vehicle-options?make=${encodeURIComponent(make)}`);
  const data: VehicleOptionsModels = await res.json();
  return data.models ?? [];
}

async function fetchYears(make: string, model: string): Promise<number[]> {
  const res = await fetch(
    `/api/public/vehicle-options?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
  );
  const data: VehicleOptionsYears = await res.json();
  if (data.year_min && data.year_max) {
    const range: number[] = [];
    for (let y = data.year_max; y >= data.year_min; y--) {
      range.push(y);
    }
    return range;
  }
  return [];
}

export function VehicleSelector({ className }: VehicleSelectorProps) {
  const t = useTranslations('catalog');
  const router = useRouter();
  const { setVehicle } = useVehicleContext();

  // Unique sentinel per fetch cycle — lets us discard stale responses.
  // useRef scopes these to the component instance (not module-level).
  const makesFetchId = useRef(0);
  const modelsFetchId = useRef(0);
  const yearsFetchId = useRef(0);

  const [makes, setMakes] = useState<string[] | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [years, setYears] = useState<number[] | null>(null);

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const isReady = !!selectedMake && !!selectedModel && !!selectedYear;
  const loadingMakes = makes === null;
  const loadingModels = !!selectedMake && models === null;
  const loadingYears = !!selectedModel && years === null;

  // Fetch makes on mount
  useEffect(() => {
    const id = ++makesFetchId.current;
    fetchMakes()
      .then((data) => {
        if (id === makesFetchId.current) setMakes(data);
      })
      .catch(() => {
        if (id === makesFetchId.current) setMakes([]);
      });
  }, []);

  // Fetch models when make changes
  useEffect(() => {
    if (!selectedMake) return;
    const id = ++modelsFetchId.current;
    fetchModels(selectedMake)
      .then((data) => {
        if (id === modelsFetchId.current) setModels(data);
      })
      .catch(() => {
        if (id === modelsFetchId.current) setModels([]);
      });
  }, [selectedMake]);

  // Fetch years when model changes
  useEffect(() => {
    if (!selectedMake || !selectedModel) return;
    const id = ++yearsFetchId.current;
    fetchYears(selectedMake, selectedModel)
      .then((data) => {
        if (id === yearsFetchId.current) setYears(data);
      })
      .catch(() => {
        if (id === yearsFetchId.current) setYears([]);
      });
  }, [selectedMake, selectedModel]);

  function handleMakeChange(value: string) {
    setSelectedMake(value);
    setSelectedModel('');
    setSelectedYear('');
    setModels(null); // Reset to loading
    setYears(null);
  }

  function handleModelChange(value: string) {
    setSelectedModel(value);
    setSelectedYear('');
    setYears(null); // Reset to loading
  }

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
        <Select value={selectedMake} onValueChange={handleMakeChange} disabled={loadingMakes}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loadingMakes ? t('vehicleSelector.loading') : t('vehicleSelector.makePlaceholder')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {(makes ?? []).map((make) => (
              <SelectItem key={make} value={make}>
                {make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Model */}
        <Select
          value={selectedModel}
          onValueChange={handleModelChange}
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
            {(models ?? []).map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year */}
        <Select
          value={selectedYear}
          onValueChange={setSelectedYear}
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
            {(years ?? []).map((year) => (
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
