import type { Metadata } from 'next';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RefaccionesDirect',
  description: 'Refacciones automotrices de fabricantes mexicanos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthKitProvider>
      {children}
      <SpeedInsights />
      <Analytics />
    </AuthKitProvider>
  );
}
