import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const GARAGE_KEY = 'vehicle-garage:v1';
const OLD_KEY = 'vehicle-context:v1';

// Dynamic import to reset module-level cache between tests
let useVehicleContext: typeof import('./use-vehicle-context').useVehicleContext;

describe('useVehicleContext', () => {
  beforeEach(async () => {
    vi.resetModules();
    sessionStorage.clear();
    const mod = await import('./use-vehicle-context');
    useVehicleContext = mod.useVehicleContext;
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  it('returns empty garage when no data stored', () => {
    const { result } = renderHook(() => useVehicleContext());
    expect(result.current.vehicle).toBeNull();
    expect(result.current.vehicles).toEqual([]);
    expect(result.current.activeIndex).toBe(-1);
  });

  // -----------------------------------------------------------------------
  // Migration from old single-vehicle key
  // -----------------------------------------------------------------------

  it('migrates old vehicle-context:v1 to new garage format', () => {
    const oldVehicle = { make: 'Toyota', model: 'Corolla', year: 2020 };
    sessionStorage.setItem(OLD_KEY, JSON.stringify(oldVehicle));

    const { result } = renderHook(() => useVehicleContext());
    expect(result.current.vehicle).toEqual(oldVehicle);
    expect(result.current.vehicles).toEqual([oldVehicle]);
    expect(result.current.activeIndex).toBe(0);

    // Old key should be removed, new key written
    expect(sessionStorage.getItem(OLD_KEY)).toBeNull();
    expect(sessionStorage.getItem(GARAGE_KEY)).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // addVehicle
  // -----------------------------------------------------------------------

  it('adds a vehicle and sets it as active', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v = { make: 'Honda', model: 'Civic', year: 2022 };

    act(() => {
      result.current.addVehicle(v);
    });

    expect(result.current.vehicles).toEqual([v]);
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.vehicle).toEqual(v);
  });

  it('adds multiple vehicles', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v1 = { make: 'Honda', model: 'Civic', year: 2022 };
    const v2 = { make: 'Toyota', model: 'Camry', year: 2023 };

    act(() => {
      result.current.addVehicle(v1);
    });
    act(() => {
      result.current.addVehicle(v2);
    });

    expect(result.current.vehicles).toEqual([v1, v2]);
    expect(result.current.activeIndex).toBe(1); // newest is active
    expect(result.current.vehicle).toEqual(v2);
  });

  it('deduplicates: activates existing vehicle instead of adding duplicate', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v1 = { make: 'Honda', model: 'Civic', year: 2022 };
    const v2 = { make: 'Toyota', model: 'Camry', year: 2023 };

    act(() => {
      result.current.addVehicle(v1);
    });
    act(() => {
      result.current.addVehicle(v2);
    });
    // Add v1 again — should not create duplicate
    act(() => {
      result.current.addVehicle(v1);
    });

    expect(result.current.vehicles).toHaveLength(2);
    expect(result.current.activeIndex).toBe(0); // v1 is at index 0
    expect(result.current.vehicle).toEqual(v1);
  });

  it('caps at 5 vehicles', () => {
    const { result } = renderHook(() => useVehicleContext());

    for (let i = 1; i <= 6; i++) {
      act(() => {
        result.current.addVehicle({ make: `Make${i}`, model: `Model${i}`, year: 2020 + i });
      });
    }

    expect(result.current.vehicles).toHaveLength(5);
    // 6th vehicle should not have been added
    expect(result.current.vehicles.find((v) => v.make === 'Make6')).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // removeVehicle
  // -----------------------------------------------------------------------

  it('removes a vehicle by index', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v1 = { make: 'Honda', model: 'Civic', year: 2022 };
    const v2 = { make: 'Toyota', model: 'Camry', year: 2023 };

    act(() => {
      result.current.addVehicle(v1);
    });
    act(() => {
      result.current.addVehicle(v2);
    });
    act(() => {
      result.current.removeVehicle(0);
    });

    expect(result.current.vehicles).toEqual([v2]);
    expect(result.current.activeIndex).toBe(0);
  });

  it('sets activeIndex to -1 when last vehicle is removed', () => {
    const { result } = renderHook(() => useVehicleContext());

    act(() => {
      result.current.addVehicle({ make: 'Honda', model: 'Civic', year: 2022 });
    });
    act(() => {
      result.current.removeVehicle(0);
    });

    expect(result.current.vehicles).toEqual([]);
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.vehicle).toBeNull();
  });

  it('adjusts activeIndex when removing a vehicle before the active one', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v1 = { make: 'Honda', model: 'Civic', year: 2022 };
    const v2 = { make: 'Toyota', model: 'Camry', year: 2023 };
    const v3 = { make: 'Ford', model: 'Focus', year: 2024 };

    act(() => {
      result.current.addVehicle(v1);
    });
    act(() => {
      result.current.addVehicle(v2);
    });
    act(() => {
      result.current.addVehicle(v3);
    });
    // Active is v3 (index 2). Remove v1 (index 0).
    act(() => {
      result.current.removeVehicle(0);
    });

    expect(result.current.vehicles).toEqual([v2, v3]);
    expect(result.current.activeIndex).toBe(1); // shifted from 2 to 1
    expect(result.current.vehicle).toEqual(v3);
  });

  // -----------------------------------------------------------------------
  // setActiveVehicle
  // -----------------------------------------------------------------------

  it('changes active vehicle by index', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v1 = { make: 'Honda', model: 'Civic', year: 2022 };
    const v2 = { make: 'Toyota', model: 'Camry', year: 2023 };

    act(() => {
      result.current.addVehicle(v1);
    });
    act(() => {
      result.current.addVehicle(v2);
    });
    act(() => {
      result.current.setActiveVehicle(0);
    });

    expect(result.current.activeIndex).toBe(0);
    expect(result.current.vehicle).toEqual(v1);
  });

  // -----------------------------------------------------------------------
  // Backward-compatible API
  // -----------------------------------------------------------------------

  it('setVehicle adds to garage (backward compat)', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v = { make: 'Nissan', model: 'Sentra', year: 2021 };

    act(() => {
      result.current.setVehicle(v);
    });

    expect(result.current.vehicle).toEqual(v);
    expect(result.current.vehicles).toEqual([v]);
  });

  it('setVehicle called twice adds both (backward compat)', () => {
    const { result } = renderHook(() => useVehicleContext());

    act(() => {
      result.current.setVehicle({ make: 'Nissan', model: 'Sentra', year: 2021 });
    });
    act(() => {
      result.current.setVehicle({ make: 'Chevrolet', model: 'Spark', year: 2023 });
    });

    expect(result.current.vehicles).toHaveLength(2);
    expect(result.current.vehicle).toEqual({ make: 'Chevrolet', model: 'Spark', year: 2023 });
  });

  it('clearVehicle sets activeIndex to -1 without removing vehicles', () => {
    const { result } = renderHook(() => useVehicleContext());
    const v = { make: 'Ford', model: 'Focus', year: 2019 };

    act(() => {
      result.current.addVehicle(v);
    });
    act(() => {
      result.current.clearVehicle();
    });

    expect(result.current.vehicle).toBeNull();
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.vehicles).toEqual([v]); // still in garage
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  it('handles corrupt JSON in sessionStorage gracefully', () => {
    sessionStorage.setItem(GARAGE_KEY, 'not valid json{{{');

    const { result } = renderHook(() => useVehicleContext());
    expect(result.current.vehicle).toBeNull();
    expect(result.current.vehicles).toEqual([]);
  });
});
