import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  count: number;
}

export function StarRating({ rating, count }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = rating - i;
    if (filled >= 1) return 'full';
    if (filled >= 0.5) return 'half';
    return 'empty';
  });

  return (
    <div data-slot="star-rating" className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {stars.map((type, i) => (
          <Star
            key={i}
            className={
              type === 'full'
                ? 'size-4 fill-amber-400 text-amber-400'
                : type === 'half'
                  ? 'size-4 fill-amber-400/50 text-amber-400'
                  : 'size-4 text-muted-foreground/30'
            }
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {rating} ({count} resenas)
      </span>
    </div>
  );
}
