import { setRequestLocale } from 'next-intl/server';
import { PromoBanner } from '@/components/storefront/promo-banner';
import { SiteHeader } from '@/components/storefront/site-header';
import { CategoryNav } from '@/components/storefront/category-nav';
import { HeroSection } from '@/components/storefront/hero-section';
import { VehicleSelector } from '@/components/storefront/vehicle-selector';
import { PromoCarousel } from '@/components/storefront/promo-carousel';
import { ValueProps } from '@/components/storefront/value-props';
import { BrandLogos } from '@/components/storefront/brand-logos';
import { RecentlyViewed } from '@/components/storefront/recently-viewed';
import { SectionDivider } from '@/components/storefront/section-divider';
import { CategoryGrid } from '@/components/storefront/category-grid';
import { SiteFooter } from '@/components/storefront/site-footer';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PromoBanner />
      <SiteHeader />
      <CategoryNav />
      <HeroSection>
        <VehicleSelector />
        <PromoCarousel />
      </HeroSection>
      <ValueProps />
      <BrandLogos />
      <RecentlyViewed />
      <SectionDivider />
      <CategoryGrid />
      <SiteFooter />
    </>
  );
}
