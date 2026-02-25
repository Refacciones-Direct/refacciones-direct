'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVehicleContext } from '@/hooks/use-vehicle-context';
import { SearchProductCard } from '@/components/catalog/search-product-card';
import { SearchPagination } from '@/components/catalog/search-pagination';
import type { SearchResultPart, SortOption } from '@/services/search/types';

interface SearchResultsProps {
  parts: SearchResultPart[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  query: string;
  sort: SortOption;
}

export function SearchResults({
  parts,
  totalCount,
  page,
  pageSize,
  hasMore,
  query,
  sort,
}: SearchResultsProps) {
  const t = useTranslations('catalog');
  const router = useRouter();
  const pathname = usePathname();
  const { vehicle } = useVehicleContext();

  const totalPages = Math.ceil(totalCount / pageSize);

  function buildCurrentUrl(): URLSearchParams {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (vehicle) {
      params.set('make', vehicle.make);
      params.set('model', vehicle.model);
      params.set('year', String(vehicle.year));
    }
    return params;
  }

  function handleSortChange(value: string) {
    const params = buildCurrentUrl();
    if (value !== 'relevance') {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  // Build base URL for pagination (preserves q, make, model, year, sort)
  const paginationParams = buildCurrentUrl();
  if (sort !== 'relevance') paginationParams.set('sort', sort);
  const baseUrl = `${pathname}?${paginationParams.toString()}`;

  // Empty state
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <SearchX className="size-16 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">{t('search.noResults.title')}</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {t('search.noResults.description')}
        </p>
        <Button variant="outline" onClick={() => router.push('/')}>
          {t('search.noResults.backHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {t('search.resultCount', { count: totalCount })}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('search.sortLabel')}</span>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">{t('search.sort.relevance')}</SelectItem>
              <SelectItem value="price_asc">{t('search.sort.priceAsc')}</SelectItem>
              <SelectItem value="price_desc">{t('search.sort.priceDesc')}</SelectItem>
              <SelectItem value="name_asc">{t('search.sort.nameAsc')}</SelectItem>
              <SelectItem value="name_desc">{t('search.sort.nameDesc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {parts.map((part) => (
          <SearchProductCard
            key={part.id}
            id={part.id}
            name={part.name}
            brand={part.brand}
            sku={part.sku}
            price={part.price}
            currency={part.currency}
            imageUrls={part.image_urls}
            category={part.category}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <SearchPagination currentPage={page} totalPages={totalPages} baseUrl={baseUrl} />
      ) : null}
    </div>
  );
}
