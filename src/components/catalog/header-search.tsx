'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVehicleContext } from '@/hooks/use-vehicle-context';

export function HeaderSearch() {
  const t = useTranslations('catalog');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { vehicle, clearVehicle } = useVehicleContext();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  const vehicleLabel = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed && !vehicle) return;

    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (vehicle) {
      params.set('make', vehicle.make);
      params.set('model', vehicle.model);
      params.set('year', String(vehicle.year));
    }
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl items-center overflow-hidden rounded-full border-[1.5px] border-border bg-background pl-4 pr-1 transition-[color,box-shadow] hover:border-ring focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
    >
      <Search className="size-5 shrink-0 text-muted-foreground" />

      {vehicleLabel ? (
        <Badge
          variant="secondary"
          className="ml-2 shrink-0 gap-1 text-xs"
          onClick={(e) => {
            e.preventDefault();
            clearVehicle();
          }}
        >
          {vehicleLabel}
          <X className="size-3 cursor-pointer" />
        </Badge>
      ) : null}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('header.searchPlaceholder')}
        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <Button type="submit" size="sm" className="h-10 rounded-full px-5 text-sm font-semibold">
        {t('header.searchButton')}
      </Button>
    </form>
  );
}
