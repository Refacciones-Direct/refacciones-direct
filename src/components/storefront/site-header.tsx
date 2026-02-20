import { Headset, ShoppingCart, User } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { HeaderSearch } from '@/components/storefront/header-search';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export async function SiteHeader() {
  const t = await getTranslations('storefront');

  return (
    <header data-slot="site-header" className={cn('border-b border-border')}>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-8 py-6">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt={t('header.logoText')} width={220} height={64} priority />
        </Link>

        {/* Search */}
        <HeaderSearch />

        {/* Right icons */}
        <div className="ml-auto flex items-center gap-4">
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
