import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryListCardProps {
  title: string;
  icon: ReactNode;
  links: string[];
  viewMoreText: string;
}

export function CategoryListCard({ title, icon, links, viewMoreText }: CategoryListCardProps) {
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
          <li key={link} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0 text-brand-blue" />
            <span className="cursor-pointer text-sm text-brand-blue hover:underline">{link}</span>
          </li>
        ))}
      </ul>

      {/* View more */}
      <div className="mt-3">
        <span className="inline-flex cursor-pointer items-center gap-1 text-sm font-bold text-brand-navy hover:underline">
          <ChevronRight className="size-3.5 shrink-0" />
          {viewMoreText}
        </span>
      </div>
    </div>
  );
}
