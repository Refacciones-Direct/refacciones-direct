/**
 * Search service: thin wrapper around Supabase RPC search functions.
 *
 * All search logic (fuzzy matching, alias resolution, multi-tier fallback)
 * lives in PostgreSQL functions (migration 007). This service handles:
 * - Input validation/normalization
 * - Supabase RPC calls
 * - Sort post-processing (price/name sorts applied in-memory)
 * - Response shaping (pagination metadata)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CombinedSearchParams,
  SearchResponse,
  SearchResultPart,
  SortOption,
  TextSearchParams,
  VehicleOptionsParams,
  VehicleOptionsResponse,
  VehicleSearchParams,
} from './types';

/**
 * RPC row shape returned by search functions (includes total_count).
 * After database types are regenerated (Step 6), this can be replaced
 * with the auto-generated types from Database['public']['Functions'].
 */
interface RpcSearchRow extends SearchResultPart {
  total_count: number;
}

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

function clampPageSize(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}

/**
 * Sort results in-memory. SQL functions sort by relevance (similarity_score DESC)
 * by default. Alternative sorts (price, name) are applied here since page sizes
 * are small (max 100) and adding sort params to every SQL function isn't worth
 * the complexity for V1.
 */
function applySortInMemory(parts: SearchResultPart[], sort: SortOption): SearchResultPart[] {
  if (sort === 'relevance') return parts;
  const sorted = [...parts];
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'price_desc':
      return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case 'name_asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));
    case 'name_desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name, 'es-MX'));
    default:
      return sorted;
  }
}

function buildResponse(
  rows: RpcSearchRow[],
  searchType: SearchResponse['search_type'],
  limit: number,
  offset: number,
  sort: SortOption,
): SearchResponse {
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  // Strip total_count from individual rows (promoted to response level)
  const data: SearchResultPart[] = rows.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ total_count: _tc, ...rest }) => rest,
  );

  const sorted = applySortInMemory(data, sort);

  return {
    data: sorted,
    total_count: totalCount,
    search_type: searchType,
    page: Math.floor(offset / limit) + 1,
    page_size: limit,
    has_more: offset + limit < totalCount,
  };
}

export class SearchService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC function types will be auto-generated after migration 007 is applied and `supabase gen types` is run. Until then, we use a generic client.
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async searchByText(params: TextSearchParams): Promise<SearchResponse> {
    const limit = clampPageSize(params.limit);
    const offset = params.offset ?? 0;

    const { data, error } = await this.supabase.rpc('search_parts_by_text', {
      search_term: params.q,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw new Error(`Search failed: ${error.message}`);

    return buildResponse(
      (data ?? []) as RpcSearchRow[],
      'text',
      limit,
      offset,
      params.sort ?? 'relevance',
    );
  }

  async searchByVehicle(params: VehicleSearchParams): Promise<SearchResponse> {
    const limit = clampPageSize(params.limit);
    const offset = params.offset ?? 0;

    const { data, error } = await this.supabase.rpc('search_parts_by_vehicle', {
      p_make: params.make,
      p_model: params.model,
      p_year: params.year,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw new Error(`Vehicle search failed: ${error.message}`);

    return buildResponse(
      (data ?? []) as RpcSearchRow[],
      'vehicle',
      limit,
      offset,
      params.sort ?? 'relevance',
    );
  }

  async searchCombined(params: CombinedSearchParams): Promise<SearchResponse> {
    const limit = clampPageSize(params.limit);
    const offset = params.offset ?? 0;

    const { data, error } = await this.supabase.rpc('search_parts_combined', {
      search_term: params.q ?? '',
      p_make: params.make ?? '',
      p_model: params.model ?? '',
      p_year: params.year ?? 0,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw new Error(`Combined search failed: ${error.message}`);

    return buildResponse(
      (data ?? []) as RpcSearchRow[],
      'combined',
      limit,
      offset,
      params.sort ?? 'relevance',
    );
  }

  async getVehicleOptions(params: VehicleOptionsParams): Promise<VehicleOptionsResponse> {
    const { data, error } = await this.supabase.rpc('get_vehicle_options', {
      p_make: params.make ?? null,
      p_model: params.model ?? null,
    });

    if (error) throw new Error(`Vehicle options failed: ${error.message}`);

    return data as unknown as VehicleOptionsResponse;
  }
}
