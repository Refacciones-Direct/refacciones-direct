import { useSyncExternalStore } from 'react';

export interface VehicleContext {
  make: string;
  model: string;
  year: number;
}

const STORAGE_KEY = 'vehicle-context:v1';
const CHANGE_EVENT = 'vehiclechange';

// Module-level cache for sessionStorage reads
let cachedValue: VehicleContext | null | undefined;

function getSnapshot(): VehicleContext | null {
  if (cachedValue !== undefined) return cachedValue;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    cachedValue = raw ? (JSON.parse(raw) as VehicleContext) : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

function getServerSnapshot(): VehicleContext | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  function handleChange() {
    cachedValue = undefined; // Invalidate cache
    callback();
  }
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener('storage', handleChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}

export function useVehicleContext() {
  const vehicle = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setVehicle(ctx: VehicleContext) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    } catch {
      // Incognito / quota exceeded — silently fail
    }
    cachedValue = undefined;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function clearVehicle() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail
    }
    cachedValue = undefined;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { vehicle, setVehicle, clearVehicle } as const;
}
