import { Headset, ShoppingCart, User } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { HeaderSearch } from '@/components/catalog/header-search';
import { Link } from '@/i18n/navigation';

export async function SiteHeader() {
  const t = await getTranslations('catalog');

  return (
    <header data-slot="site-header" className="border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8 lg:px-20">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt={t('header.logoText')} width={160} height={46} priority />
        </Link>

        {/* Search */}
        <HeaderSearch />

        {/* Nav links */}
        <nav className="flex items-center gap-5">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-brand-navy hover:text-brand-blue"
          >
            <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-current">
              <Headset className="size-5" />
            </span>
            <span className="text-sm font-medium leading-tight">{t('header.help')}</span>
          </Link>

          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-brand-navy hover:text-brand-blue"
          >
            <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-current">
              <User className="size-5" />
            </span>
            <span className="text-sm font-medium leading-tight">{t('header.account')}</span>
          </Link>

          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-brand-navy hover:text-brand-blue"
          >
            <span className="relative flex size-9 items-center justify-center rounded-full border-[1.5px] border-current">
              <ShoppingCart className="size-5" />
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white">
                0
              </span>
            </span>
            <span className="text-sm font-medium leading-tight">{t('header.cart')}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
