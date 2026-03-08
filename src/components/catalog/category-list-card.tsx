import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

interface CategoryListCardProps {
  title: string;
  icon: ReactNode;
  links: string[];
  viewMoreText: string;
  href?: string;
}

export function CategoryListCard({
  title,
  icon,
  links,
  viewMoreText,
  href,
}: CategoryListCardProps) {
  return (
    <div
      data-slot="category-list-card"
      className={cn('rounded-lg border border-border bg-card p-6')}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="text-muted-foreground">{icon}</div>
      </div>

      {/* Links list */}
      <ul className="mt-4 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0 text-brand-blue" />
            {href ? (
              <Link href={href} className="text-base text-brand-blue hover:underline">
                {link}
              </Link>
            ) : (
              <span className="cursor-pointer text-base text-brand-blue hover:underline">
                {link}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* View more */}
      <div className="mt-3">
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-base font-bold text-brand-navy hover:underline"
          >
            <ChevronRight className="size-3.5 shrink-0" />
            {viewMoreText}
          </Link>
        ) : (
          <span className="inline-flex cursor-pointer items-center gap-1.5 text-base font-bold text-brand-navy hover:underline">
            <ChevronRight className="size-3.5 shrink-0" />
            {viewMoreText}
          </span>
        )}
      </div>
    </div>
  );
}
