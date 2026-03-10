'use client';

import { useState } from 'react';
import { RotateCcw, Shield, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AddedToCartSidebar } from '@/components/catalog/cart/added-to-cart-sidebar';
import { FitmentBadge } from '@/components/catalog/pdp/fitment-badge';
import { QuantityStepper } from '@/components/catalog/pdp/quantity-stepper';
import { StarRating } from '@/components/catalog/pdp/star-rating';
import { useCartContext } from '@/hooks/use-cart-context';
import type { MockProduct } from '@/data/mock-demo';
import { formatPrice } from '@/data/mock-demo';

interface ProductInfoProps {
  product: MockProduct;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const t = useTranslations('catalog');
  const { addItem } = useCartContext();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addedQty, setAddedQty] = useState(1);

  async function handleAddToCart() {
    setIsAdding(true);
    setAddedQty(quantity);
    addItem(product, quantity);
    // Simulate API latency (replace with real call when available)
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsAdding(false);
    setSidebarOpen(true);
  }

  return (
    <div data-slot="product-info" className="flex flex-col gap-4">
      {/* Brand + Name + Meta + Rating */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {product.brand}
        </span>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {t('pdp.partNumber')}: {product.partNumber}
          </span>
          <span>
            {t('pdp.sku')}: {product.sku}
          </span>
        </div>
        <StarRating rating={product.rating} count={product.reviewCount} />
      </div>

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
          size="lg"
          className="flex-1 bg-brand-navy text-white hover:bg-brand-navy/90 disabled:opacity-100"
          disabled={isAdding}
          onClick={handleAddToCart}
        >
          {isAdding ? <Spinner /> : t('pdp.addToCart')}
        </Button>
      </div>

      {/* Subtotal row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t('pdp.perUnit', { price: formatPrice(product.price) })}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{t('pdp.subtotal')}</span>
          <span className="text-base font-bold">{formatPrice(product.price * quantity)}</span>
          <span className="text-xs text-muted-foreground">{product.currency}</span>
        </div>
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

      <AddedToCartSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        addedProduct={product}
        addedQuantity={addedQty}
      />
    </div>
  );
}

function Spinner() {
  return (
    <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}
