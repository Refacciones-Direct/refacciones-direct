import { cn } from '@/lib/utils';
import { Container } from './container';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  'data-slot'?: string;
}

export function Section({ children, className, 'data-slot': dataSlot }: SectionProps) {
  return (
    <section data-slot={dataSlot} className={cn('py-6', className)}>
      <Container>{children}</Container>
    </section>
  );
}
