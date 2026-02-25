/**
 * Search service types for the catalog search.
 *
 * These types flow through: API Route -> SearchService -> Supabase RPC -> UI
 */

// ---------------------------------------------------------------------------
// Search Parameters
// ---------------------------------------------------------------------------

export interface TextSearchParams {
  q: string;
  limit?: number;
  offset?: number;
  sort?: SortOption;
}

export interface VehicleSearchParams {
  make: string;
  model: string;
  year: number;
  limit?: number;
  offset?: number;
  sort?: SortOption;
}

export interface CombinedSearchParams {
  q?: string;
  make?: string;
  model?: string;
  year?: number;
  limit?: number;
  offset?: number;
  sort?: SortOption;
}

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

export interface VehicleOptionsParams {
  make?: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// Search Results
// ---------------------------------------------------------------------------

export interface SearchResultPart {
  id: number;
  manufacturer_id: number;
  sku: string;
  brand: string;
  name: string;
  description: string | null;
  category: string;
  part_type: string;
  price: number | null;
  currency: string;
  quantity: number;
  condition: string;
  image_urls: string[];
  attributes: Record<string, unknown>;
  match_type: string;
  similarity_score: number;
}

export interface SearchResponse {
  data: SearchResultPart[];
  total_count: number;
  search_type: 'text' | 'vehicle' | 'combined';
  page: number;
  page_size: number;
  has_more: boolean;
}

// ---------------------------------------------------------------------------
// Vehicle Options (Dropdown Data)
// ---------------------------------------------------------------------------

export interface VehicleOptionsMakes {
  makes: string[];
}

export interface VehicleOptionsModels {
  models: string[];
}

export interface VehicleOptionsYears {
  year_min: number;
  year_max: number;
}

export type VehicleOptionsResponse =
  | VehicleOptionsMakes
  | VehicleOptionsModels
  | VehicleOptionsYears;

// ---------------------------------------------------------------------------
// Vehicle Context (Session State)
// ---------------------------------------------------------------------------

export interface VehicleContext {
  make: string;
  model: string;
  year: number;
}

// ---------------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------------

export interface SearchError {
  error: string;
  code: 'INVALID_PARAMS' | 'SEARCH_FAILED' | 'INTERNAL_ERROR';
}
