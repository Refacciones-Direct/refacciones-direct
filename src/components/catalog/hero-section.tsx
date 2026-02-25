import { cn } from '@/lib/utils';
import { Container } from '@/components/shared/container';

interface HeroSectionProps {
  children: React.ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  return (
    <section data-slot="hero-section" className={cn('bg-card py-6')}>
      <Container>{children}</Container>
    </section>
  );
}
