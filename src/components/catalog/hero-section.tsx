import { cn } from '@/lib/utils';

interface HeroSectionProps {
  children: React.ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section data-slot="hero-section" className={cn('bg-card py-6')}>
      <div className="mx-auto grid max-w-7xl grid-cols-[520px_1fr] gap-6 px-4">{children}</div>
    </section>
  );
}
