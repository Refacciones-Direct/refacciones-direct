import { Facebook, Instagram, Youtube } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Container } from '@/components/shared/container';

export async function SiteFooter() {
  const t = await getTranslations('catalog');

  const col2Links = t.raw('footer.col2Links') as string[];
  const col3Links = t.raw('footer.col3Links') as string[];

  const socialLinks = [
    { icon: Facebook, label: 'Facebook' },
    { icon: Youtube, label: 'YouTube' },
    { icon: Instagram, label: 'Instagram' },
  ];

  const paymentMethods = [
    { name: 'Visa', src: '/images/payments/visa.svg' },
    { name: 'Mastercard', src: '/images/payments/mastercard.svg' },
    { name: 'Amex', src: '/images/payments/amex.svg' },
    { name: 'OXXO', src: '/images/payments/oxxo.svg' },
  ];

  return (
    <footer data-slot="site-footer" className={cn('w-full bg-brand-navy text-white')}>
      <Container className="py-12">
        <div className="grid grid-cols-4 gap-12">
          {/* Column 1 - Help & payments */}
          <div className="flex flex-col gap-4">
            <h4 className="text-base font-semibold">{t('footer.helpTitle')}</h4>
            <span className="cursor-pointer text-sm text-white hover:text-white/80">
              {t('footer.returnLink')}
            </span>
            <div className="mt-2 flex gap-2">
              {paymentMethods.map((method) => (
                <Image
                  key={method.name}
                  src={method.src}
                  alt={method.name}
                  width={44}
                  height={28}
                  className="rounded bg-white"
                />
              ))}
            </div>
          </div>

          {/* Column 2 - Information (no heading per Pencil design) */}
          <div className="flex flex-col gap-3">
            {col2Links.map((link) => (
              <span key={link} className="cursor-pointer text-sm text-white hover:text-white/80">
                {link}
              </span>
            ))}
          </div>

          {/* Column 3 - Legal (no heading per Pencil design) */}
          <div className="flex flex-col gap-3">
            {col3Links.map((link) => (
              <span key={link} className="cursor-pointer text-sm text-white hover:text-white/80">
                {link}
              </span>
            ))}
          </div>

          {/* Column 4 - Social */}
          <div className="flex flex-col gap-3">
            <h4 className="text-base font-semibold">{t('footer.followTitle')}</h4>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="cursor-pointer text-white hover:text-white/80"
                  aria-label={label}
                >
                  <Icon className="size-6" />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="mt-8 border-t border-white/10 pt-4 text-center text-xs text-white/50">
          {t('footer.copyright')}
        </div>
      </Container>
    </footer>
  );
}
