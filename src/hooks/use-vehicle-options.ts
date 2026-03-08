import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  VehicleOptionsMakes,
  VehicleOptionsModels,
  VehicleOptionsYears,
} from '@/services/search/types';

// ---------------------------------------------------------------------------
// Fetch helpers (shared between VehicleSelector and VehicleSidebar)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseVehicleOptionsParams {
  /** Only start fetching when enabled (e.g., when sidebar is open). Defaults to true. */
  enabled?: boolean;
}

export function useVehicleOptions({ enabled = true }: UseVehicleOptionsParams = {}) {
  // Stale-response guards
  const makesFetchId = useRef(0);
  const modelsFetchId = useRef(0);
  const yearsFetchId = useRef(0);

  // Data state (null = loading)
  const [makes, setMakes] = useState<string[] | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [years, setYears] = useState<number[] | null>(null);

  // Selection state
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const loadingMakes = makes === null;
  const loadingModels = !!selectedMake && models === null;
  const loadingYears = !!selectedModel && years === null;
  const isReady = !!selectedMake && !!selectedModel && !!selectedYear;

  // Fetch makes
  useEffect(() => {
    if (!enabled || makes !== null) return;
    const id = ++makesFetchId.current;
    fetchMakes()
      .then((data) => {
        if (id === makesFetchId.current) setMakes(data);
      })
      .catch(() => {
        if (id === makesFetchId.current) setMakes([]);
      });
  }, [enabled, makes]);

  // Fetch models when make changes
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

  // Fetch years when model changes
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

  // Selection handlers (cascade resets)
  function selectMake(make: string) {
    setSelectedMake(make);
    setSelectedModel('');
    setSelectedYear('');
    setModels(null);
    setYears(null);
  }

  function selectModel(model: string) {
    setSelectedModel(model);
    setSelectedYear('');
    setYears(null);
  }

  function selectYear(year: string) {
    setSelectedYear(year);
  }

  /** Reset all selections and data back to initial state. */
  function reset() {
    setSelectedMake('');
    setSelectedModel('');
    setSelectedYear('');
    setMakes(null);
    setModels(null);
    setYears(null);
  }

  /** Reset only models/years (e.g., when navigating back to make tab). */
  function resetToMake() {
    setSelectedMake('');
    setSelectedModel('');
    setSelectedYear('');
    setModels(null);
    setYears(null);
  }

  /** Reset only years (e.g., when navigating back to model tab). */
  function resetToModel() {
    setSelectedModel('');
    setSelectedYear('');
    setYears(null);
  }

  /** Get filtered items by search query for a given list. */
  function filterItems(items: string[], query: string): string[] {
    const q = query.toLowerCase().trim();
    return q ? items.filter((item) => item.toLowerCase().includes(q)) : items;
  }

  /** Get the year list as strings for consistent filtering/display. */
  const yearStrings = useMemo(() => (years ?? []).map(String), [years]);

  return {
    // Data
    makes: makes ?? [],
    models: models ?? [],
    years: years ?? [],
    yearStrings,

    // Selection
    selectedMake,
    selectedModel,
    selectedYear,

    // Loading states
    loadingMakes,
    loadingModels,
    loadingYears,
    isReady,

    // Actions
    selectMake,
    selectModel,
    selectYear,
    reset,
    resetToMake,
    resetToModel,
    filterItems,
  } as const;
}
