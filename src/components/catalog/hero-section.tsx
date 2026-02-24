import { cn } from '@/lib/utils';

interface HeroSectionProps {
  children: React.ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section data-slot="hero-section" className={cn('bg-card py-6')}>
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-20">{children}</div>
    </section>
  );
}
