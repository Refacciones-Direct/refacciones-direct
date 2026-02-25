import { Car, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VehicleContext } from '@/services/search/types';

interface VehicleCardProps {
  vehicle: VehicleContext;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  deleteLabel: string;
}

export function VehicleCard({
  vehicle,
  isActive,
  onSelect,
  onDelete,
  deleteLabel,
}: VehicleCardProps) {
  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
        isActive
          ? 'rounded-r-lg border-l-[3px] border-primary bg-accent'
          : 'rounded-lg border border-border bg-white hover:bg-accent',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Icon stack — active has check badge overlay */}
      {isActive ? (
        <div className="relative size-12 shrink-0">
          <div className="absolute bottom-0 right-0 flex size-11 items-center justify-center rounded-md bg-muted">
            <Car className="size-6 text-muted-foreground" />
          </div>
          <div className="absolute left-0 top-0 z-10 flex size-4.5 items-center justify-center rounded-full bg-primary">
            <Check className="size-2.5 text-white" />
          </div>
        </div>
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
          <Car className="size-6 text-muted-foreground" />
        </div>
      )}

      {/* Vehicle info */}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold text-foreground">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
      </div>

      {/* Delete button */}
      <button
        type="button"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={deleteLabel}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
