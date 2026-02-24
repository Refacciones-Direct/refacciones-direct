import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { SiteFooter } from '@/components/catalog/site-footer';
import { SearchResultsServer } from '@/components/catalog/search-results-server';

function SearchFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="size-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-primary" />
    </div>
  );
}

export default async function SearchPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('catalog');
  const searchParams = await props.searchParams;

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">{t('search.title')}</h1>
        <Suspense fallback={<SearchFallback />}>
          <SearchResultsServer searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
