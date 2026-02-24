'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Car, Check, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useVehicleContext } from '@/hooks/use-vehicle-context';
import { useRouter } from '@/i18n/navigation';
import type {
  VehicleOptionsMakes,
  VehicleOptionsModels,
  VehicleOptionsYears,
} from '@/services/search/types';

type Tab = 'make' | 'model' | 'year';

interface VehicleSidebarProps {
  open: boolean;
  onClose: () => void;
}

async function fetchMakes(): Promise<string[]> {
  const res = await fetch('/api/public/vehicle-options');
  if (!res.ok) throw new Error(`Failed to fetch makes: ${res.status}`);
  const data: VehicleOptionsMakes = await res.json();
  return data.makes ?? [];
}

async function fetchModels(make: string): Promise<string[]> {
  const res = await fetch(`/api/public/vehicle-options?make=${encodeURIComponent(make)}`);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);
  const data: VehicleOptionsModels = await res.json();
  return data.models ?? [];
}

async function fetchYears(make: string, model: string): Promise<number[]> {
  const res = await fetch(
    `/api/public/vehicle-options?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch years: ${res.status}`);
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

const TABS: Tab[] = ['make', 'model', 'year'];

export function VehicleSidebar({ open, onClose }: VehicleSidebarProps) {
  const t = useTranslations('catalog.vehicleSidebar');
  const router = useRouter();
  const { vehicle, setVehicle } = useVehicleContext();

  const [activeTab, setActiveTab] = useState<Tab>('make');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Data state
  const [makes, setMakes] = useState<string[] | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [years, setYears] = useState<number[] | null>(null);

  // Stale-response guards
  const makesFetchId = useRef(0);
  const modelsFetchId = useRef(0);
  const yearsFetchId = useRef(0);

  // --- Render-phase state adjustment for open/close transitions ---
  // React docs: "adjust state during render" pattern avoids effects for prop transitions
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      // Opening — pre-populate from existing vehicle context
      if (vehicle) {
        setSelectedMake(vehicle.make);
        setSelectedModel(vehicle.model);
        setSelectedYear(String(vehicle.year));
      } else {
        setSelectedMake('');
        setSelectedModel('');
        setSelectedYear('');
      }
      setActiveTab('make');
      setSearchQuery('');
      setModels(null);
      setYears(null);
    }
  }

  // Close — reset after slide-out animation completes (async setTimeout is fine)
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => {
      setActiveTab('make');
      setSelectedMake('');
      setSelectedModel('');
      setSelectedYear('');
      setMakes(null);
      setModels(null);
      setYears(null);
      setSearchQuery('');
    }, 300);
    return () => clearTimeout(timer);
  }, [open]);

  // --- Data fetching effects (no synchronous setState, only async callbacks) ---

  // Fetch makes on first open
  useEffect(() => {
    if (!open || makes !== null) return;
    const id = ++makesFetchId.current;
    fetchMakes()
      .then((data) => {
        if (id === makesFetchId.current) setMakes(data);
      })
      .catch(() => {
        if (id === makesFetchId.current) setMakes([]);
      });
  }, [open, makes]);

  // Fetch models when make is set and models need loading
  useEffect(() => {
    if (!selectedMake || models !== null) return;
    const id = ++modelsFetchId.current;
    fetchModels(selectedMake)
      .then((data) => {
        if (id === modelsFetchId.current) setModels(data);
      })
      .catch(() => {
        if (id === modelsFetchId.current) setModels([]);
      });
  }, [selectedMake, models]);

  // Fetch years when make+model set and years need loading
  useEffect(() => {
    if (!selectedMake || !selectedModel || years !== null) return;
    const id = ++yearsFetchId.current;
    fetchYears(selectedMake, selectedModel)
      .then((data) => {
        if (id === yearsFetchId.current) setYears(data);
      })
      .catch(() => {
        if (id === yearsFetchId.current) setYears([]);
      });
  }, [selectedMake, selectedModel, years]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // --- Tab switching (always clears search) ---

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSearchQuery('');
  }

  // --- Selection handlers ---

  function handleSelectMake(make: string) {
    setSelectedMake(make);
    setSelectedModel('');
    setSelectedYear('');
    setModels(null); // triggers models fetch effect
    setYears(null);
    switchTab('model');
  }

  function handleSelectModel(model: string) {
    setSelectedModel(model);
    setSelectedYear('');
    setYears(null); // triggers years fetch effect
    switchTab('year');
  }

  function handleSelectYear(year: number) {
    setVehicle({ make: selectedMake, model: selectedModel, year });
    onClose();
    router.push(
      `/search?make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}&year=${year}`,
    );
  }

  const handleBack = useCallback(() => {
    if (activeTab === 'year') {
      switchTab('model');
      setSelectedModel('');
      setSelectedYear('');
    } else if (activeTab === 'model') {
      switchTab('make');
      setSelectedMake('');
      setSelectedYear('');
      setModels(null);
      setYears(null);
    } else {
      onClose();
    }
  }, [activeTab, onClose]);

  // Filter current list by search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeTab === 'make') {
      const items = makes ?? [];
      return q ? items.filter((m) => m.toLowerCase().includes(q)) : items;
    }
    if (activeTab === 'model') {
      const items = models ?? [];
      return q ? items.filter((m) => m.toLowerCase().includes(q)) : items;
    }
    const items = (years ?? []).map(String);
    return q ? items.filter((y) => y.includes(q)) : items;
  }, [activeTab, makes, models, years, searchQuery]);

  const isLoading =
    (activeTab === 'make' && makes === null) ||
    (activeTab === 'model' && models === null) ||
    (activeTab === 'year' && years === null);

  const title =
    activeTab === 'make' ? t('title') : activeTab === 'model' ? t('chooseModel') : t('chooseYear');

  const searchPlaceholder =
    activeTab === 'make'
      ? t('searchMake')
      : activeTab === 'model'
        ? t('searchModel')
        : t('searchYear');

  const contextLabel =
    activeTab === 'year'
      ? `${selectedMake} ${selectedModel}`
      : activeTab === 'model'
        ? selectedMake
        : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-100 max-w-[85vw] flex-col bg-white shadow-[4px_0_16px_rgba(0,0,0,0.15)] transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
      >
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
          <span className="text-base font-semibold text-foreground">{title}</span>
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
              (tab === 'model' && !selectedMake) || (tab === 'year' && !selectedModel);
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
                    const isSelected = item === selectedMake;
                    return (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => handleSelectMake(item)}
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
                </>
              )}
              {activeTab === 'model' &&
                filteredItems.map((item) => {
                  const isSelected = item === selectedModel;
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
                  const isSelected = item === selectedYear;
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
      </aside>
    </>
  );
}
