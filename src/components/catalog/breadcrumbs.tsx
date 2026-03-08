import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      data-slot="breadcrumbs"
      className="flex items-center gap-1.5 text-sm"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
            {isLast || !item.href ? (
              <span className="text-muted-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="text-brand-blue hover:underline">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
