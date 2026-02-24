import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const STORAGE_KEY = 'vehicle-context:v1';

// Dynamic import to reset module-level cache between tests
let useVehicleContext: typeof import('../use-vehicle-context').useVehicleContext;

describe('useVehicleContext', () => {
  beforeEach(async () => {
    vi.resetModules();
    sessionStorage.clear();
    const mod = await import('../use-vehicle-context');
    useVehicleContext = mod.useVehicleContext;
  });

  it('returns null when no vehicle is stored', () => {
    const { result } = renderHook(() => useVehicleContext());
    expect(result.current.vehicle).toBeNull();
  });

  it('reads existing vehicle from sessionStorage', () => {
    const vehicle = { make: 'Toyota', model: 'Corolla', year: 2020 };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle));

    const { result } = renderHook(() => useVehicleContext());
    expect(result.current.vehicle).toEqual(vehicle);
  });

  it('sets vehicle and updates state', () => {
    const { result } = renderHook(() => useVehicleContext());
    const vehicle = { make: 'Honda', model: 'Civic', year: 2022 };

    act(() => {
      result.current.setVehicle(vehicle);
    });

    expect(result.current.vehicle).toEqual(vehicle);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)).toEqual(vehicle);
  });

  it('clears vehicle and updates state', () => {
    const vehicle = { make: 'Ford', model: 'Focus', year: 2019 };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle));

    const { result } = renderHook(() => useVehicleContext());
    expect(result.current.vehicle).toEqual(vehicle);

    act(() => {
      result.current.clearVehicle();
    });

    expect(result.current.vehicle).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('overwrites previous vehicle when setVehicle is called again', () => {
    const { result } = renderHook(() => useVehicleContext());

    act(() => {
      result.current.setVehicle({ make: 'Nissan', model: 'Sentra', year: 2021 });
    });

    act(() => {
      result.current.setVehicle({ make: 'Chevrolet', model: 'Spark', year: 2023 });
    });

    expect(result.current.vehicle).toEqual({
      make: 'Chevrolet',
      model: 'Spark',
      year: 2023,
    });
  });

  it('handles corrupt JSON in sessionStorage gracefully', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not valid json{{{');

    const { result } = renderHook(() => useVehicleContext());
    expect(result.current.vehicle).toBeNull();
  });
});
