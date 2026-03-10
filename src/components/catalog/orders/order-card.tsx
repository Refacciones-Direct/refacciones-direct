import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductThumbnail } from '@/components/shared/product-thumbnail';
import { cn } from '@/lib/utils';
import { type MockOrder, formatPrice } from '@/data/mock-demo';

interface OrderCardProps {
  order: MockOrder;
}

const STATUS_STYLES = {
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  processing: 'bg-amber-50 text-amber-700 border-amber-200',
  shipped: 'bg-blue-50 text-blue-700 border-blue-200',
} as const;

const STATUS_KEYS = {
  delivered: 'orders.statusDelivered',
  processing: 'orders.statusProcessing',
  shipped: 'orders.statusShipped',
} as const;

export async function OrderCard({ order }: OrderCardProps) {
  const t = await getTranslations('catalog');

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card data-slot="order-card">
      <CardContent className="space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">
              {t('orders.orderNumber')} {order.id}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('orders.placed')}: {order.date}
            </p>
          </div>
          <Badge className={cn('border', STATUS_STYLES[order.status])}>
            {t(STATUS_KEYS[order.status])}
          </Badge>
        </div>

        {/* Items row */}
        <div className="flex items-center gap-2">
          {order.items.map((item) => (
            <ProductThumbnail
              key={item.product.id}
              src={item.product.imageUrl}
              alt={item.product.name}
              className="size-12"
            />
          ))}
          <span className="ml-1 text-sm text-muted-foreground">
            {t('orders.items', { count: itemCount })}
          </span>
        </div>

        {/* Footer row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <div>
            <span className="text-sm font-bold">{formatPrice(order.total)}</span>
            <span className="ml-2 text-xs text-muted-foreground">{order.deliveryMethod}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orders/${order.id}/tracking`}>{t('orders.viewOrder')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orders/${order.id}/tracking`}>{t('orders.track')}</Link>
            </Button>
            {order.status === 'delivered' && (
              <Button variant="outline" size="sm">
                {t('orders.buyAgain')}
              </Button>
            )}
            {order.status === 'processing' && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                {t('orders.cancel')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
