import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/catalog/site-header';
import { CategoryNav } from '@/components/catalog/category-nav';
import { SiteFooter } from '@/components/catalog/site-footer';
import { Container } from '@/components/shared/container';
import { CartPageContent } from '@/components/catalog/cart/cart-page-content';

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main>
        <Container className="py-8">
          <CartPageContent />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
