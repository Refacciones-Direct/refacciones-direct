import { setRequestLocale } from 'next-intl/server';
import { PromoBanner } from '@/components/catalog/promo-banner';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { HeroSection } from '@/components/catalog/hero-section';
import { PromoCarousel } from '@/components/catalog/promo-carousel';
import { ValueProps } from '@/components/catalog/value-props';
import { BrandLogos } from '@/components/catalog/brand-logos';
import { RecentlyViewed } from '@/components/catalog/recently-viewed';
import { SiteFooter } from '@/components/catalog/site-footer';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PromoBanner />
      <SiteHeader />
      <CategoryNav />
      <HeroSection>
        <PromoCarousel />
      </HeroSection>
      <ValueProps />
      <BrandLogos />
      <RecentlyViewed />
      <SiteFooter />
    </>
  );
}
