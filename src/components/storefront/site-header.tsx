import { Car, Headset, Search, ShoppingCart, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export async function SiteHeader() {
  const t = await getTranslations('storefront');

  return (
    <header data-slot="site-header" className={cn('border-b border-border')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        {/* Logo */}
        <Link href="/" className="flex w-60 shrink-0 items-center gap-2">
          <Car className="size-7 text-brand-navy" />
          <span className="text-lg font-extrabold text-brand-navy">{t('header.logoText')}</span>
        </Link>

        {/* Search */}
        <Link
          href="/search"
          className="flex max-w-120 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-brand-blue"
        >
          <Search className="size-4.5 shrink-0" />
          <span>{t('header.searchPlaceholder')}</span>
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] font-medium text-brand-navy hover:text-brand-blue"
          >
            <Headset className="size-4.5" />
            <span className="hidden lg:inline">{t('header.help')}</span>
          </Link>

          <Link
            href="/"
            aria-label={t('header.ariaUser')}
            className="text-brand-navy hover:text-brand-blue"
          >
            <User className="size-5.5" />
          </Link>

          <Link
            href="/"
            aria-label={t('header.ariaCart')}
            className="relative text-brand-navy hover:text-brand-blue"
          >
            <ShoppingCart className="size-5.5" />
            <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold text-white">
              0
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
