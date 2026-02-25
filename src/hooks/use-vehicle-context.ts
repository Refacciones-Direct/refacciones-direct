import { useSyncExternalStore } from 'react';
import type { VehicleContext, VehicleGarage } from '@/services/search/types';

export type { VehicleContext, VehicleGarage };

const GARAGE_KEY = 'vehicle-garage:v1';
const OLD_KEY = 'vehicle-context:v1';
const CHANGE_EVENT = 'vehiclechange';
const MAX_VEHICLES = 5;

const EMPTY_GARAGE: VehicleGarage = { vehicles: [], activeIndex: -1 };

// Module-level cache for sessionStorage reads
let cachedGarage: VehicleGarage | undefined;

function isSameVehicle(a: VehicleContext, b: VehicleContext): boolean {
  return a.make === b.make && a.model === b.model && a.year === b.year;
}

function getSnapshot(): VehicleGarage {
  if (cachedGarage !== undefined) return cachedGarage;
  try {
    const raw = sessionStorage.getItem(GARAGE_KEY);
    if (raw) {
      cachedGarage = JSON.parse(raw) as VehicleGarage;
    } else {
      // Migrate from old single-vehicle key
      const oldRaw = sessionStorage.getItem(OLD_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw) as VehicleContext;
        cachedGarage = { vehicles: [old], activeIndex: 0 };
        sessionStorage.setItem(GARAGE_KEY, JSON.stringify(cachedGarage));
        sessionStorage.removeItem(OLD_KEY);
      } else {
        cachedGarage = EMPTY_GARAGE;
      }
    }
  } catch {
    cachedGarage = EMPTY_GARAGE;
  }
  return cachedGarage;
}

function getServerSnapshot(): VehicleGarage {
  return EMPTY_GARAGE;
}

function subscribe(callback: () => void): () => void {
  function handleChange() {
    cachedGarage = undefined; // Invalidate cache
    callback();
  }
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener('storage', handleChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}

function writeGarage(garage: VehicleGarage) {
  try {
    sessionStorage.setItem(GARAGE_KEY, JSON.stringify(garage));
  } catch {
    // Incognito / quota exceeded — silently fail
  }
  cachedGarage = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useVehicleContext() {
  const garage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const vehicle: VehicleContext | null =
    garage.activeIndex >= 0 && garage.activeIndex < garage.vehicles.length
      ? garage.vehicles[garage.activeIndex]
      : null;

  // --- New multi-vehicle API ---

  function addVehicle(ctx: VehicleContext) {
    const g = getSnapshot();
    // Deduplicate: if same vehicle exists, just activate it
    const existingIdx = g.vehicles.findIndex((v) => isSameVehicle(v, ctx));
    if (existingIdx >= 0) {
      writeGarage({ ...g, activeIndex: existingIdx });
      return;
    }
    // Cap at MAX_VEHICLES
    if (g.vehicles.length >= MAX_VEHICLES) return;
    const newVehicles = [...g.vehicles, ctx];
    writeGarage({ vehicles: newVehicles, activeIndex: newVehicles.length - 1 });
  }

  function removeVehicle(index: number) {
    const g = getSnapshot();
    if (index < 0 || index >= g.vehicles.length) return;
    const newVehicles = g.vehicles.filter((_, i) => i !== index);
    let newActive = g.activeIndex;
    if (newVehicles.length === 0) {
      newActive = -1;
    } else if (index === g.activeIndex) {
      newActive = 0;
    } else if (index < g.activeIndex) {
      newActive = g.activeIndex - 1;
    }
    writeGarage({ vehicles: newVehicles, activeIndex: newActive });
  }

  function setActiveVehicle(index: number) {
    const g = getSnapshot();
    if (index < 0 || index >= g.vehicles.length) return;
    writeGarage({ ...g, activeIndex: index });
  }

  // --- Backward-compatible API (existing consumers keep working) ---

  function setVehicle(ctx: VehicleContext) {
    addVehicle(ctx);
  }

  function clearVehicle() {
    const g = getSnapshot();
    writeGarage({ ...g, activeIndex: -1 });
  }

  return {
    // Backward-compatible
    vehicle,
    setVehicle,
    clearVehicle,
    // Multi-vehicle
    vehicles: garage.vehicles,
    activeIndex: garage.activeIndex,
    addVehicle,
    removeVehicle,
    setActiveVehicle,
  } as const;
}
