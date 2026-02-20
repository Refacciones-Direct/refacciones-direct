'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function HeaderSearch() {
  const t = useTranslations('storefront');
  const router = useRouter();
  const [query, setQuery] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-105 items-center rounded-full border-[1.5px] border-border bg-background pl-4 pr-1 transition-[color,box-shadow] hover:border-ring focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
    >
      <Search className="size-5 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('header.searchPlaceholder')}
        className="flex-1 bg-transparent px-2 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <Button
        type="submit"
        size="sm"
        className="h-10 rounded-full px-5 text-[13px] font-semibold"
      >
        {t('header.searchButton')}
      </Button>
    </form>
  );
}
