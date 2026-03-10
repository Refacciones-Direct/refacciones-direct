import { Headset, User } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/shared/container';
import { HeaderSearch } from '@/components/catalog/header-search';
import { CartIcon } from '@/components/catalog/cart-icon';

export async function SiteHeader() {
  const t = await getTranslations('catalog');

  return (
    <header data-slot="site-header" className="border-b border-border">
      <Container className="flex items-center justify-between gap-6 py-4">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt={t('header.logoText')} width={160} height={46} priority />
        </Link>

        {/* Search bar */}
        <HeaderSearch />

        {/* Nav links */}
        <nav className="flex items-center gap-5">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-brand-navy hover:text-brand-red"
          >
            <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-current">
              <Headset className="size-5" />
            </span>
            <span className="text-center text-sm font-medium leading-tight">
              {t('header.help')}
            </span>
          </Link>

          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-brand-navy hover:text-brand-red"
          >
            <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-current">
              <User className="size-5" />
            </span>
            <span className="text-center text-sm font-medium leading-tight">
              {t('header.account')}
            </span>
          </Link>

          <CartIcon label={t('header.cart')} />
        </nav>
      </Container>
    </header>
  );
}
