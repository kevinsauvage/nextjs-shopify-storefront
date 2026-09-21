'use client';

import { useMemo } from 'react';

import type { ProductVariant } from '@/hooks/useProductSelection';
import { getQuantityCap } from '@/utils/inventory';

export type ProductVariantView = {
  quantityAvailable?: number | null;
  availableForSale?: boolean;
  price?: { amount: string; currencyCode: string } | null;
  compareAtPrice?: { amount: string; currencyCode: string } | null;
  sku?: string | null;
  title?: string;
  weight?: number | null;
  weightUnit?: string | null;
};

/**
 * Derives the presentational view of the selected variant from a single place,
 * so the PDP and quick view cannot drift on price, stock cap or discount.
 */
const useProductVariantView = (
  selectedVariant: ProductVariant | undefined,
  fallback?: ProductVariantView | null,
) => {
  const view: ProductVariantView | undefined = selectedVariant ?? fallback ?? undefined;

  const {
    availableForSale,
    compareAtPrice,
    price,
    quantityAvailable,
    sku,
    title,
    weight,
    weightUnit,
  } = view ?? {};

  const quantityCap = useMemo(() => getQuantityCap(quantityAvailable), [quantityAvailable]);

  const hasDiscount =
    !!compareAtPrice && !!price && Number(compareAtPrice.amount) > Number(price.amount);

  return {
    availableForSale,
    compareAtPrice,
    hasDiscount,
    price,
    quantityAvailable,
    quantityCap,
    sku,
    title,
    weight,
    weightUnit,
  };
};

export default useProductVariantView;
