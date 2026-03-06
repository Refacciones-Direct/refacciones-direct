'use client';

import { useState } from 'react';
import { RotateCcw, Shield, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FitmentBadge } from '@/components/catalog/pdp/fitment-badge';
import { QuantityStepper } from '@/components/catalog/pdp/quantity-stepper';
import { StarRating } from '@/components/catalog/pdp/star-rating';
import type { MockProduct } from '@/data/mock-demo';
import { formatPrice } from '@/data/mock-demo';

interface ProductInfoProps {
  product: MockProduct;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const t = useTranslations('catalog');
  const [quantity, setQuantity] = useState(1);

  return (
    <div data-slot="product-info" className="flex flex-col gap-4">
      {/* Brand */}
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {product.brand}
      </span>

      {/* Name */}
      <h1 className="text-2xl font-bold">{product.name}</h1>

      {/* Part number + SKU */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {t('pdp.partNumber')}: {product.partNumber}
        </span>
        <span>
          {t('pdp.sku')}: {product.sku}
        </span>
      </div>

      {/* Rating */}
      <StarRating rating={product.rating} count={product.reviewCount} />

      <Separator />

      {/* Fitment badge */}
      <FitmentBadge />

      {/* Price + stock */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
        {product.inStock ? (
          <Badge variant="outline" className="gap-1.5 border-emerald-200 text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {t('pdp.inStock')}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 border-red-200 text-red-700">
            <span className="size-1.5 rounded-full bg-red-500" />
            {t('pdp.outOfStock')}
          </Badge>
        )}
      </div>

      {/* Shipping options */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-muted-foreground" />
          <div>
            <span className="font-medium">{t('pdp.freeShipping')}</span>
            <p className="text-xs text-muted-foreground">{t('pdp.freeShippingEta')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-muted-foreground" />
          <div>
            <span className="font-medium">{t('pdp.expressShipping')}</span>
            <p className="text-xs text-muted-foreground">{t('pdp.expressShippingEta')}</p>
          </div>
        </div>
      </div>

      {/* Quantity + Add to cart */}
      <div className="flex items-center gap-4">
        <QuantityStepper value={quantity} onChange={setQuantity} />
        <Button
          asChild
          size="lg"
          className="flex-1 bg-brand-navy text-white hover:bg-brand-navy/90"
        >
          <Link href="/cart">{t('pdp.addToCart')}</Link>
        </Button>
      </div>

      {/* Trust signals */}
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="size-4" />
          <span>{t('pdp.warranty')}</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="size-4" />
          <span>{t('pdp.returns')}</span>
        </div>
      </div>
    </div>
  );
}
