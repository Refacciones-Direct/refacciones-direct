import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchResults } from '../search-results';
import type { SearchResultPart, SortOption } from '@/services/search/types';

// --- Mocks ---

const mockPush = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      'search.resultCount': `${params?.count ?? 0} results`,
      'search.sortLabel': 'Sort by:',
      'search.sort.relevance': 'Relevance',
      'search.sort.priceAsc': 'Price: low to high',
      'search.sort.priceDesc': 'Price: high to low',
      'search.sort.nameAsc': 'Name: A-Z',
      'search.sort.nameDesc': 'Name: Z-A',
      'search.noResults.title': 'No results found',
      'search.noResults.description': 'Try different search terms.',
      'search.noResults.backHome': 'Back to home',
    };
    return map[key] ?? key;
  },
  useLocale: () => 'es-MX',
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/search',
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/use-vehicle-context', () => ({
  useVehicleContext: () => ({
    vehicle: null,
    setVehicle: vi.fn(),
    clearVehicle: vi.fn(),
  }),
}));

function makePart(overrides: Partial<SearchResultPart> = {}): SearchResultPart {
  return {
    id: 1,
    manufacturer_id: 1,
    sku: 'TEST-001',
    brand: 'Brembo',
    name: 'Brake Pad Set',
    description: null,
    category: 'Braking',
    part_type: 'brake_pad',
    price: 250.5,
    currency: 'MXN',
    quantity: 10,
    condition: 'new',
    image_urls: [],
    attributes: {},
    match_type: 'exact',
    similarity_score: 1.0,
    ...overrides,
  };
}

const defaultProps = {
  parts: [] as SearchResultPart[],
  totalCount: 0,
  page: 1,
  pageSize: 24,
  hasMore: false,
  query: 'brake',
  sort: 'relevance' as SortOption,
  vehicleLabel: null,
};

describe('SearchResults', () => {
  it('renders empty state when no results', () => {
    render(<SearchResults {...defaultProps} />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try different search terms.')).toBeInTheDocument();
    expect(screen.getByText('Back to home')).toBeInTheDocument();
  });

  it('renders product grid with correct count', () => {
    const parts = [
      makePart({ id: 1, name: 'Brake Pad A', sku: 'BP-001' }),
      makePart({ id: 2, name: 'Brake Pad B', sku: 'BP-002' }),
      makePart({ id: 3, name: 'Brake Pad C', sku: 'BP-003' }),
    ];

    render(<SearchResults {...defaultProps} parts={parts} totalCount={3} />);

    expect(screen.getByText('3 results')).toBeInTheDocument();
    expect(screen.getByText('Brake Pad A')).toBeInTheDocument();
    expect(screen.getByText('Brake Pad B')).toBeInTheDocument();
    expect(screen.getByText('Brake Pad C')).toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    const parts = [makePart()];

    render(<SearchResults {...defaultProps} parts={parts} totalCount={1} />);

    expect(screen.getByText('Sort by:')).toBeInTheDocument();
  });

  it('shows vehicle label badge when provided', () => {
    const parts = [makePart()];

    render(
      <SearchResults
        {...defaultProps}
        parts={parts}
        totalCount={1}
        vehicleLabel="Toyota Corolla 2020"
      />,
    );

    expect(screen.getByText('Toyota Corolla 2020')).toBeInTheDocument();
  });

  it('does not render pagination for single page', () => {
    const parts = [makePart()];

    const { container } = render(<SearchResults {...defaultProps} parts={parts} totalCount={1} />);

    expect(container.querySelector('[data-slot="pagination"]')).toBeNull();
  });

  it('renders pagination when multiple pages exist', () => {
    const parts = Array.from({ length: 24 }, (_, i) =>
      makePart({ id: i + 1, sku: `SKU-${i}`, name: `Part ${i}` }),
    );

    const { container } = render(
      <SearchResults {...defaultProps} parts={parts} totalCount={72} hasMore />,
    );

    expect(container.querySelector('[data-slot="pagination"]')).not.toBeNull();
  });
});
