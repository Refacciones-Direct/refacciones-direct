'use client';

import { ArrowRight, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function VehicleSelector() {
  const t = useTranslations('storefront');

  return (
    <div
      data-slot="vehicle-selector"
      className={cn('rounded-lg border border-border bg-card p-6 shadow')}
    >
      <h2 className="text-center text-lg font-semibold">{t('vehicleSelector.title')}</h2>

      <Tabs defaultValue="placa" className="mt-5 gap-5">
        <TabsList className="h-9! w-full rounded-lg border border-input bg-secondary-hover p-1!">
          <TabsTrigger
            value="placa"
            className="flex-1 cursor-pointer rounded-md font-bold text-foreground hover:bg-border data-[state=active]:bg-brand-navy data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {t('vehicleSelector.tabPlaca')}
          </TabsTrigger>
          <TabsTrigger
            value="modelo"
            className="flex-1 cursor-pointer rounded-md font-bold text-foreground hover:bg-border data-[state=active]:bg-brand-navy data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {t('vehicleSelector.tabModelo')}
          </TabsTrigger>
        </TabsList>

        {/* Placa tab */}
        <TabsContent value="placa" className="min-h-45 space-y-4">
          {/* Input row */}
          <div className="flex items-center gap-3">
            <Input placeholder={t('vehicleSelector.placaPlaceholder')} className="flex-1" />
            <button
              type="button"
              aria-label={t('vehicleSelector.search')}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-red text-white hover:bg-brand-red-hover"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>

          {/* Checkbox row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="garage" />
              <label htmlFor="garage" className="text-sm">
                {t('vehicleSelector.garageLabel')}
              </label>
            </div>
            <Info className="size-3.5 text-muted-foreground" />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[13px] font-medium text-muted-foreground">O</span>
            <Separator className="flex-1" />
          </div>

          {/* Select dropdown */}
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('vehicleSelector.registeredVehicle')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>
                {t('vehicleSelector.registeredVehicle')}
              </SelectItem>
            </SelectContent>
          </Select>
        </TabsContent>

        {/* Modelo tab */}
        <TabsContent value="modelo" className="min-h-45 space-y-4">
          {/* VIN input */}
          <div className="flex items-center gap-3">
            <Input placeholder={t('vehicleSelector.vinPlaceholder')} className="flex-1" />
            <button
              type="button"
              aria-label={t('vehicleSelector.search')}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-red text-white hover:bg-brand-red-hover"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>

          {/* Separator with OR */}
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">{t('vehicleSelector.or')}</span>
            <Separator className="flex-1" />
          </div>

          {/* Search by model button */}
          <Button variant="default" className="w-full">
            {t('vehicleSelector.searchByModel')}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
