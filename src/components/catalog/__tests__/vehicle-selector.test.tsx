import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VehicleSelector } from '../vehicle-selector';

// --- Mocks ---

const mockPush = vi.fn();
const mockSetVehicle = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'vehicleSelector.title': 'Identify your vehicle',
      'vehicleSelector.makePlaceholder': 'Make',
      'vehicleSelector.modelPlaceholder': 'Model',
      'vehicleSelector.yearPlaceholder': 'Year',
      'vehicleSelector.searchButton': 'Search parts',
      'vehicleSelector.loading': 'Loading...',
    };
    return map[key] ?? key;
  },
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/use-vehicle-context', () => ({
  useVehicleContext: () => ({
    vehicle: null,
    setVehicle: mockSetVehicle,
    clearVehicle: vi.fn(),
  }),
}));

function mockFetch(responses: Record<string, unknown>) {
  return vi.fn(async (url: string) => ({
    json: async () => {
      for (const [pattern, data] of Object.entries(responses)) {
        if (url.includes(pattern)) return data;
      }
      return {};
    },
  }));
}

describe('VehicleSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and three select triggers', async () => {
    global.fetch = mockFetch({
      'vehicle-options': { makes: ['Toyota', 'Honda'] },
    }) as unknown as typeof fetch;

    render(<VehicleSelector />);

    expect(screen.getByText('Identify your vehicle')).toBeInTheDocument();
    expect(screen.getByText('Search parts')).toBeInTheDocument();

    // Wait for makes to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('loads makes on mount', async () => {
    global.fetch = mockFetch({
      'vehicle-options': { makes: ['Chevrolet', 'Nissan', 'Toyota'] },
    }) as unknown as typeof fetch;

    render(<VehicleSelector />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/public/vehicle-options');
    });
  });

  it('disables search button when no vehicle is selected', async () => {
    global.fetch = mockFetch({
      'vehicle-options': { makes: ['Toyota'] },
    }) as unknown as typeof fetch;

    render(<VehicleSelector />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const button = screen.getByRole('button', { name: 'Search parts' });
    expect(button).toBeDisabled();
  });
});
