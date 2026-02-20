import type { Metadata } from 'next';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { Outfit, Geist_Mono } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RefaccionesDirect',
  description: 'Refacciones automotrices de fabricantes mexicanos',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${outfit.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <AuthKitProvider>
          {children}
          <SpeedInsights />
          <Analytics />
        </AuthKitProvider>
      </body>
    </html>
  );
}
