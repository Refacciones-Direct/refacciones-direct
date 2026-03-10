'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Car, Check, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useVehicleContext } from '@/hooks/use-vehicle-context';
import { useVehicleOptions } from '@/hooks/use-vehicle-options';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { DrawerShell } from '@/components/ui/drawer-shell';
import { VehicleCard } from '@/components/catalog/vehicle-card';

type Tab = 'make' | 'model' | 'year';
type SidebarView = 'list' | 'add' | 'delete';

interface VehicleSidebarProps {
  open: boolean;
  onClose: () => void;
}

const TABS: Tab[] = ['make', 'model', 'year'];
const MAX_VEHICLES = 5;

export function VehicleSidebar({ open, onClose }: VehicleSidebarProps) {
  const t = useTranslations('catalog.vehicleSidebar');
  const router = useRouter();
  const { vehicles, activeIndex, addVehicle, removeVehicle, setActiveVehicle, clearVehicle } =
    useVehicleContext();

  // View state: 'list' (garage), 'add' (make/model/year flow), or 'delete' (confirmation)
  const [view, setView] = useState<SidebarView>('list');
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('make');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shared vehicle options hook
  const options = useVehicleOptions({ enabled: open && view === 'add' });

  // --- Render-phase state adjustment for open/close transitions ---
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      // Opening — decide which view to show
      if (vehicles.length > 0) {
        setView('list');
      } else {
        setView('add');
      }
      // Reset add flow + delete state
      setDeleteTargetIndex(null);
      options.reset();
      setActiveTab('make');
      setSearchQuery('');
    }
  }

  // Close — reset after slide-out animation completes
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setView('list');
      setActiveTab('make');
      options.reset();
      setSearchQuery('');
    }, 300);
    return () => clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Tab switching ---

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSearchQuery('');
  }

  // --- Selection handlers (add flow) ---

  function handleSelectMake(make: string) {
    options.selectMake(make);
    switchTab('model');
  }

  function handleSelectModel(model: string) {
    options.selectModel(model);
    switchTab('year');
  }

  function handleSelectYear(year: number) {
    addVehicle({ make: options.selectedMake, model: options.selectedModel, year });
    onClose();
    router.push(
      `/search?make=${encodeURIComponent(options.selectedMake)}&model=${encodeURIComponent(options.selectedModel)}&year=${year}`,
    );
  }

  // --- List view handlers ---

  function handleSelectVehicle(index: number) {
    const v = vehicles[index];
    setActiveVehicle(index);
    onClose();
    router.push(
      `/search?make=${encodeURIComponent(v.make)}&model=${encodeURIComponent(v.model)}&year=${v.year}`,
    );
  }

  function handleDeleteVehicle(index: number) {
    setDeleteTargetIndex(index);
    setView('delete');
  }

  function handleConfirmDelete() {
    if (deleteTargetIndex !== null) {
      removeVehicle(deleteTargetIndex);
    }
    setDeleteTargetIndex(null);
    setView(vehicles.length > 1 ? 'list' : 'add');
  }

  function handleCancelDelete() {
    setDeleteTargetIndex(null);
    setView('list');
  }

  function handleShopWithout() {
    clearVehicle();
    onClose();
  }

  function handleAddNewVehicle() {
    setView('add');
    options.reset();
    setActiveTab('make');
    setSearchQuery('');
  }

  // --- Back handler ---

  function handleBack() {
    if (view === 'delete') {
      handleCancelDelete();
    } else if (view === 'add') {
      if (activeTab === 'year') {
        switchTab('model');
        options.resetToModel();
      } else if (activeTab === 'model') {
        switchTab('make');
        options.resetToMake();
      } else if (vehicles.length > 0) {
        setView('list');
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  }

  // --- Filtered items for add flow ---

  const filteredItems = useMemo(() => {
    if (view !== 'add') return [];
    if (activeTab === 'make') return options.filterItems(options.makes, searchQuery);
    if (activeTab === 'model') return options.filterItems(options.models, searchQuery);
    return options.filterItems(options.yearStrings, searchQuery);
  }, [view, activeTab, options, searchQuery]);

  const isLoading =
    view === 'add' &&
    ((activeTab === 'make' && options.loadingMakes) ||
      (activeTab === 'model' && options.loadingModels) ||
      (activeTab === 'year' && options.loadingYears));

  const addTitle =
    activeTab === 'make' ? t('title') : activeTab === 'model' ? t('chooseModel') : t('chooseYear');

  const searchPlaceholder =
    activeTab === 'make'
      ? t('searchMake')
      : activeTab === 'model'
        ? t('searchModel')
        : t('searchYear');

  const contextLabel =
    activeTab === 'year'
      ? `${options.selectedMake} ${options.selectedModel}`
      : activeTab === 'model'
        ? options.selectedMake
        : null;

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      ariaLabel={
        view === 'list'
          ? t('chooseVehicle')
          : view === 'delete'
            ? t('deleteVehicleTitle')
            : addTitle
      }
    >
      {/* ============================================================= */}
      {/* LIST VIEW — Garage                                            */}
      {/* ============================================================= */}
      {view === 'list' && (
        <>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">{t('chooseVehicle')}</span>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('close')}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Vehicle cards */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              {/* Active vehicle */}
              {activeIndex >= 0 && activeIndex < vehicles.length && (
                <VehicleCard
                  key={`${vehicles[activeIndex].year}-${vehicles[activeIndex].make}-${vehicles[activeIndex].model}`}
                  vehicle={vehicles[activeIndex]}
                  isActive={true}
                  onSelect={() => handleSelectVehicle(activeIndex)}
                  onDelete={() => handleDeleteVehicle(activeIndex)}
                  deleteLabel={t('deleteVehicle')}
                />
              )}

              {/* Shop without vehicle link — right-aligned */}
              <button
                type="button"
                className="self-end text-[13px] font-medium text-muted-foreground hover:text-foreground"
                onClick={handleShopWithout}
              >
                {t('shopWithout')}
              </button>

              {/* Saved vehicles section */}
              {vehicles.filter((_, i) => i !== activeIndex).length > 0 && (
                <span className="text-[13px] font-semibold text-foreground">
                  {t('savedVehicles', {
                    count: vehicles.filter((_, i) => i !== activeIndex).length,
                  })}
                </span>
              )}

              {/* Inactive vehicle cards */}
              {vehicles.map((v, i) =>
                i !== activeIndex ? (
                  <VehicleCard
                    key={`${v.year}-${v.make}-${v.model}`}
                    vehicle={v}
                    isActive={false}
                    onSelect={() => handleSelectVehicle(i)}
                    onDelete={() => handleDeleteVehicle(i)}
                    deleteLabel={t('deleteVehicle')}
                  />
                ) : null,
              )}
            </div>
          </div>

          {/* Add new vehicle button — pinned to bottom */}
          <div className="shrink-0 border-t border-border px-4 py-4">
            <Button
              className="w-full uppercase tracking-wider"
              onClick={handleAddNewVehicle}
              disabled={vehicles.length >= MAX_VEHICLES}
            >
              {t('addNewVehicle')}
            </Button>
          </div>
        </>
      )}

      {/* ============================================================= */}
      {/* DELETE VIEW — Confirmation                                    */}
      {/* ============================================================= */}
      {view === 'delete' && deleteTargetIndex !== null && vehicles[deleteTargetIndex] && (
        <>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <button
              type="button"
              onClick={handleCancelDelete}
              className="text-foreground hover:text-muted-foreground"
              aria-label={t('back')}
            >
              <ArrowLeft className="size-5" />
            </button>
            <span className="text-base font-semibold text-foreground">
              {t('deleteVehicleTitle')}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('close')}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col items-center gap-6 px-6 pt-8">
            <div className="flex flex-col gap-2 text-center">
              <span className="text-base font-bold text-foreground">
                {t('deleteConfirmQuestion')}
              </span>
              <span className="text-sm text-muted-foreground">{t('deleteConfirmSubtitle')}</span>
            </div>

            {/* Vehicle preview card */}
            <div className="flex w-full items-center gap-4 rounded-lg border border-border p-5">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Car className="size-8 text-muted-foreground" />
              </div>
              <span className="text-base font-bold text-foreground">
                {vehicles[deleteTargetIndex].year} {vehicles[deleteTargetIndex].make}{' '}
                {vehicles[deleteTargetIndex].model}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 gap-3 border-t border-border p-4">
            <Button
              variant="outline"
              className="flex-1 uppercase tracking-wider"
              onClick={handleCancelDelete}
            >
              {t('keepVehicle')}
            </Button>
            <Button
              className="flex-1 bg-foreground uppercase tracking-wider text-white hover:bg-foreground/90"
              onClick={handleConfirmDelete}
            >
              {t('deleteVehicle')}
            </Button>
          </div>
        </>
      )}

      {/* ============================================================= */}
      {/* ADD VIEW — Make / Model / Year progressive flow               */}
      {/* ============================================================= */}
      {view === 'add' && (
        <>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <button
              type="button"
              onClick={handleBack}
              className="text-foreground hover:text-muted-foreground"
              aria-label={t('back')}
            >
              <ArrowLeft className="size-5" />
            </button>
            <span className="text-base font-semibold text-foreground">{addTitle}</span>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('close')}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Selected context bar */}
          {contextLabel && (
            <div className="flex shrink-0 items-center gap-2 bg-accent px-5 py-2.5">
              <Car className="size-4.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{contextLabel}</span>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-border px-5">
            {TABS.map((tab) => {
              const isActive = tab === activeTab;
              const isDisabled =
                (tab === 'model' && !options.selectedMake) ||
                (tab === 'year' && !options.selectedModel);
              return (
                <button
                  key={tab}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && switchTab(tab)}
                  className={cn(
                    'flex-1 py-3 text-center text-[13px] font-medium uppercase tracking-wider',
                    isActive
                      ? 'border-b-2 border-primary font-semibold text-primary'
                      : 'text-muted-foreground',
                    isDisabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {t(`tab.${tab}`)}
                </button>
              );
            })}
          </div>

          {/* Search input */}
          <div className="shrink-0 px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg border-[1.5px] border-input bg-accent px-4 py-3 transition-[border-color,box-shadow] hover:border-ring focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <Search className="size-4.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <div className="flex items-center justify-center px-5 py-8 text-sm text-muted-foreground">
                {t('loading')}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex items-center justify-center px-5 py-8 text-sm text-muted-foreground">
                {t('noResults')}
              </div>
            ) : (
              <ul className="flex flex-col">
                {activeTab === 'make' && (
                  <>
                    <li className="px-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground leading-[3.2]">
                      {t('allMakes')}
                    </li>
                    {filteredItems.map((item) => {
                      const isSelected = item === options.selectedMake;
                      return (
                        <li key={item}>
                          <button
                            type="button"
                            onClick={() => handleSelectMake(item)}
                            className={cn(
                              'flex w-full cursor-pointer items-center justify-between px-5 text-left text-sm leading-[3.2] hover:bg-accent hover:text-primary',
                              isSelected
                                ? 'bg-accent font-semibold text-primary'
                                : 'text-foreground',
                            )}
                          >
                            {item}
                            {isSelected && <Check className="size-4 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </>
                )}
                {activeTab === 'model' &&
                  filteredItems.map((item) => {
                    const isSelected = item === options.selectedModel;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => handleSelectModel(item)}
                          className={cn(
                            'flex w-full cursor-pointer items-center justify-between px-5 text-left text-sm leading-[3.2] hover:bg-accent hover:text-primary',
                            isSelected ? 'bg-accent font-semibold text-primary' : 'text-foreground',
                          )}
                        >
                          {item}
                          {isSelected && <Check className="size-4 shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                {activeTab === 'year' &&
                  filteredItems.map((item) => {
                    const isSelected = item === options.selectedYear;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => handleSelectYear(Number(item))}
                          className={cn(
                            'flex w-full cursor-pointer items-center justify-between px-5 text-left text-sm leading-[3.2] hover:bg-accent hover:text-primary',
                            isSelected ? 'bg-accent font-semibold text-primary' : 'text-foreground',
                          )}
                        >
                          {item}
                          {isSelected && <Check className="size-4 shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </>
      )}
    </DrawerShell>
  );
}
