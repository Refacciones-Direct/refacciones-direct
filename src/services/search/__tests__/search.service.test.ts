import { describe, it, expect, vi } from 'vitest';
import { SearchService } from '../search.service';
import type { SearchResultPart } from '../types';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

function createMockRpcResult(data: unknown[] | null, error: { message: string } | null = null) {
  return { data, error };
}

function createMockSupabase(rpcResults: Record<string, ReturnType<typeof createMockRpcResult>>) {
  return {
    rpc: vi.fn((fnName: string) => {
      const result =
        rpcResults[fnName] ?? createMockRpcResult(null, { message: `Unknown function: ${fnName}` });
      return Promise.resolve(result);
    }),
  } as unknown as Parameters<(typeof SearchService)['prototype']['searchByText']> extends never
    ? never
    : ConstructorParameters<typeof SearchService>[0];
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePart(
  overrides: Partial<SearchResultPart & { total_count: number }> = {},
): SearchResultPart & { total_count: number } {
  return {
    id: 1,
    manufacturer_id: 1,
    sku: 'SKU-001',
    brand: 'TestBrand',
    name: 'Maza delantera',
    description: 'Test part',
    category: 'mazas',
    part_type: 'maza',
    price: 450,
    currency: 'MXN',
    quantity: 10,
    condition: 'new',
    image_urls: [],
    attributes: {},
    match_type: 'exact_sku',
    similarity_score: 1.0,
    total_count: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchService', () => {
  // =========================================================================
  // searchByText
  // =========================================================================
  describe('searchByText', () => {
    it('calls supabase.rpc with correct params', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([makePart()]),
      });
      const service = new SearchService(mockSupabase);

      await service.searchByText({ q: 'maza', limit: 10, offset: 0 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_parts_by_text', {
        search_term: 'maza',
        p_limit: 10,
        p_offset: 0,
      });
    });

    it('returns shaped response with pagination metadata', async () => {
      const parts = [makePart({ id: 1, total_count: 47 }), makePart({ id: 2, total_count: 47 })];
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult(parts),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'maza', limit: 24, offset: 0 });

      expect(result.total_count).toBe(47);
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(24);
      expect(result.has_more).toBe(true);
      expect(result.search_type).toBe('text');
      expect(result.data).toHaveLength(2);
      // total_count should be stripped from individual results
      expect(result.data[0]).not.toHaveProperty('total_count');
    });

    it('returns empty response when no results', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([]),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'nonexistent' });

      expect(result.total_count).toBe(0);
      expect(result.data).toHaveLength(0);
      expect(result.has_more).toBe(false);
    });

    it('throws on supabase error', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult(null, { message: 'DB error' }),
      });
      const service = new SearchService(mockSupabase);

      await expect(service.searchByText({ q: 'test' })).rejects.toThrow('Search failed: DB error');
    });
  });

  // =========================================================================
  // searchByVehicle
  // =========================================================================
  describe('searchByVehicle', () => {
    it('calls supabase.rpc with correct params', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_vehicle: createMockRpcResult([makePart({ match_type: 'vehicle_fitment' })]),
      });
      const service = new SearchService(mockSupabase);

      await service.searchByVehicle({ make: 'Chevrolet', model: 'Silverado', year: 2020 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_parts_by_vehicle', {
        p_make: 'Chevrolet',
        p_model: 'Silverado',
        p_year: 2020,
        p_limit: 24,
        p_offset: 0,
      });
    });

    it('returns vehicle search type', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_vehicle: createMockRpcResult([makePart({ total_count: 5 })]),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByVehicle({ make: 'Ford', model: 'F-150', year: 2020 });

      expect(result.search_type).toBe('vehicle');
    });
  });

  // =========================================================================
  // searchCombined
  // =========================================================================
  describe('searchCombined', () => {
    it('calls supabase.rpc with correct params', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_combined: createMockRpcResult([makePart({ match_type: 'combined' })]),
      });
      const service = new SearchService(mockSupabase);

      await service.searchCombined({
        q: 'maza',
        make: 'Chevrolet',
        model: 'Silverado',
        year: 2020,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_parts_combined', {
        search_term: 'maza',
        p_make: 'Chevrolet',
        p_model: 'Silverado',
        p_year: 2020,
        p_limit: 24,
        p_offset: 0,
      });
    });

    it('defaults missing params to empty string / 0', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_combined: createMockRpcResult([]),
      });
      const service = new SearchService(mockSupabase);

      await service.searchCombined({});

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_parts_combined', {
        search_term: '',
        p_make: '',
        p_model: '',
        p_year: 0,
        p_limit: 24,
        p_offset: 0,
      });
    });
  });

  // =========================================================================
  // getVehicleOptions
  // =========================================================================
  describe('getVehicleOptions', () => {
    it('returns makes when no params', async () => {
      const mockData = { makes: ['BMW', 'Chevrolet', 'Ford'] };
      const mockSupabase = createMockSupabase({
        get_vehicle_options: createMockRpcResult(mockData as unknown as unknown[]),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.getVehicleOptions({});

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_vehicle_options', {
        p_make: null,
        p_model: null,
      });
      expect(result).toEqual(mockData);
    });

    it('passes make param for model lookup', async () => {
      const mockData = { models: ['Aveo', 'Silverado', 'Trax'] };
      const mockSupabase = createMockSupabase({
        get_vehicle_options: createMockRpcResult(mockData as unknown as unknown[]),
      });
      const service = new SearchService(mockSupabase);

      await service.getVehicleOptions({ make: 'Chevrolet' });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_vehicle_options', {
        p_make: 'Chevrolet',
        p_model: null,
      });
    });

    it('passes make + model for year range', async () => {
      const mockData = { year_min: 2007, year_max: 2024 };
      const mockSupabase = createMockSupabase({
        get_vehicle_options: createMockRpcResult(mockData as unknown as unknown[]),
      });
      const service = new SearchService(mockSupabase);

      await service.getVehicleOptions({ make: 'Chevrolet', model: 'Silverado' });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_vehicle_options', {
        p_make: 'Chevrolet',
        p_model: 'Silverado',
      });
    });
  });

  // =========================================================================
  // Page size clamping
  // =========================================================================
  describe('page size clamping', () => {
    it('defaults to 24 when no limit', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([]),
      });
      const service = new SearchService(mockSupabase);

      await service.searchByText({ q: 'test' });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_parts_by_text',
        expect.objectContaining({
          p_limit: 24,
        }),
      );
    });

    it('caps at 100 when limit exceeds max', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([]),
      });
      const service = new SearchService(mockSupabase);

      await service.searchByText({ q: 'test', limit: 500 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_parts_by_text',
        expect.objectContaining({
          p_limit: 100,
        }),
      );
    });

    it('defaults to 24 for zero or negative limit', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([]),
      });
      const service = new SearchService(mockSupabase);

      await service.searchByText({ q: 'test', limit: 0 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_parts_by_text',
        expect.objectContaining({
          p_limit: 24,
        }),
      );
    });
  });

  // =========================================================================
  // Sort post-processing
  // =========================================================================
  describe('sort post-processing', () => {
    const parts = [
      makePart({ id: 1, name: 'Alternador', price: 1200, total_count: 3 }),
      makePart({ id: 2, name: 'Maza', price: 450, total_count: 3 }),
      makePart({ id: 3, name: 'Soporte', price: 800, total_count: 3 }),
    ];

    it('sorts by price ascending', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult(parts),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', sort: 'price_asc' });

      expect(result.data.map((p) => p.price)).toEqual([450, 800, 1200]);
    });

    it('sorts by price descending', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult(parts),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', sort: 'price_desc' });

      expect(result.data.map((p) => p.price)).toEqual([1200, 800, 450]);
    });

    it('sorts by name ascending', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult(parts),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', sort: 'name_asc' });

      expect(result.data.map((p) => p.name)).toEqual(['Alternador', 'Maza', 'Soporte']);
    });

    it('sorts by name descending', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult(parts),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', sort: 'name_desc' });

      expect(result.data.map((p) => p.name)).toEqual(['Soporte', 'Maza', 'Alternador']);
    });

    it('handles null prices in sort (null goes last on asc)', async () => {
      const partsWithNull = [
        makePart({ id: 1, price: null as unknown as number, total_count: 2 }),
        makePart({ id: 2, price: 200, total_count: 2 }),
      ];
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult(partsWithNull),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', sort: 'price_asc' });

      expect(result.data[0].price).toBe(200);
      expect(result.data[1].price).toBeNull();
    });
  });

  // =========================================================================
  // Pagination calculation
  // =========================================================================
  describe('pagination calculation', () => {
    it('calculates page 1 correctly', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([makePart({ total_count: 50 })]),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', limit: 24, offset: 0 });

      expect(result.page).toBe(1);
      expect(result.has_more).toBe(true);
    });

    it('calculates page 2 correctly', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([makePart({ total_count: 50 })]),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', limit: 24, offset: 24 });

      expect(result.page).toBe(2);
      expect(result.has_more).toBe(true);
    });

    it('sets has_more false on last page', async () => {
      const mockSupabase = createMockSupabase({
        search_parts_by_text: createMockRpcResult([makePart({ total_count: 25 })]),
      });
      const service = new SearchService(mockSupabase);

      const result = await service.searchByText({ q: 'test', limit: 24, offset: 24 });

      expect(result.has_more).toBe(false);
    });
  });
});
