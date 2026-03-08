import { cn } from '@/lib/utils';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function Container({ children, className, as: Tag = 'div' }: ContainerProps) {
  return (
    <Tag className={cn('mx-auto max-w-screen-2xl px-4 md:px-8 lg:px-20', className)}>
      {children}
    </Tag>
  );
}
