import { createClient } from '@/lib/supabase/server';
import { SearchService } from '@/services/search';
import { SearchResults } from '@/components/catalog/search-results';
import type { SortOption } from '@/services/search/types';

const VALID_SORTS = new Set<SortOption>([
  'relevance',
  'price_asc',
  'price_desc',
  'name_asc',
  'name_desc',
]);

interface SearchResultsServerProps {
  searchParams: Record<string, string | string[] | undefined>;
}

function getString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export async function SearchResultsServer({ searchParams }: SearchResultsServerProps) {
  const q = getString(searchParams.q);
  const make = getString(searchParams.make);
  const model = getString(searchParams.model);
  const yearRaw = getString(searchParams.year);
  const year = yearRaw ? parseInt(yearRaw, 10) : 0;
  const pageRaw = getString(searchParams.page);
  const page = Math.max(1, pageRaw ? parseInt(pageRaw, 10) : 1);
  const sortRaw = getString(searchParams.sort) as SortOption;
  const sort: SortOption = VALID_SORTS.has(sortRaw) ? sortRaw : 'relevance';

  const PAGE_SIZE = 24;
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const service = new SearchService(supabase);

  const result = await service.searchCombined({
    q: q || undefined,
    make: make || undefined,
    model: model || undefined,
    year: year || undefined,
    limit: PAGE_SIZE,
    offset,
    sort,
  });

  return (
    <SearchResults
      parts={result.data}
      totalCount={result.total_count}
      page={result.page}
      pageSize={result.page_size}
      hasMore={result.has_more}
      query={q}
      sort={sort}
    />
  );
}
