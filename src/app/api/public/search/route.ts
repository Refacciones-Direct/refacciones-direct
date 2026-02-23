import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SearchService } from '@/services/search';
import type { SortOption } from '@/services/search';

const VALID_SORTS: SortOption[] = ['relevance', 'price_asc', 'price_desc', 'name_asc', 'name_desc'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() ?? '';
    const make = searchParams.get('make')?.trim() ?? '';
    const model = searchParams.get('model')?.trim() ?? '';
    const yearStr = searchParams.get('year') ?? '';
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 24;
    const offsetStr = searchParams.get('offset');
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    const sortRaw = searchParams.get('sort') ?? 'relevance';
    const sort: SortOption = VALID_SORTS.includes(sortRaw as SortOption)
      ? (sortRaw as SortOption)
      : 'relevance';

    // At least one search parameter required
    if (!q && !make) {
      return NextResponse.json(
        {
          error: 'At least one search parameter is required (q or make)',
          code: 'INVALID_PARAMS',
        },
        { status: 400 },
      );
    }

    // Vehicle search requires all three params
    if (make && (!model || !year || isNaN(year))) {
      return NextResponse.json(
        {
          error: 'Vehicle search requires make, model, and year',
          code: 'INVALID_PARAMS',
        },
        { status: 400 },
      );
    }

    // Year range validation
    if (year !== undefined && (year < 1900 || year > 2100)) {
      return NextResponse.json(
        { error: 'Year must be between 1900 and 2100', code: 'INVALID_PARAMS' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const searchService = new SearchService(supabase);

    const hasVehicle = make && model && year && !isNaN(year);
    const hasText = q.length > 0;

    if (hasText && hasVehicle) {
      const result = await searchService.searchCombined({
        q,
        make,
        model,
        year,
        limit,
        offset,
        sort,
      });
      return NextResponse.json(result);
    }

    if (hasVehicle) {
      const result = await searchService.searchByVehicle({
        make,
        model,
        year: year!,
        limit,
        offset,
        sort,
      });
      return NextResponse.json(result);
    }

    const result = await searchService.searchByText({
      q,
      limit,
      offset,
      sort,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Public search error:', error);
    return NextResponse.json({ error: 'Search failed', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
