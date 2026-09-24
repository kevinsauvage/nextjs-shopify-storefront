'use client';

import { useEffect, useState } from 'react';

import { getBestSellersAction } from '@/actions/productsActions';
import HomeSection from '@/app/_components/HomeSection';
import { reportError } from '@/lib/logger';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import ProductRail from './ProductRail';

/**
 * Store best-sellers rail for recovery moments (search with no results, empty
 * cart). Fetched client-side so it can live inside client-rendered empty states.
 * Renders nothing — heading included — until there is something to show.
 */
const BestSellersRail = () => {
  const [products, setProducts] = useState<ProductFieldsFragment[]>([]);

  useEffect(() => {
    let cancelled = false;

    getBestSellersAction()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((error) => {
        reportError('BestSellersRail', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="border-t border-border/60">
      <div className="container mx-auto px-4 md:px-6">
        <HomeSection eyebrow="Popular" title="Best sellers">
          <ProductRail products={products} />
        </HomeSection>
      </div>
    </section>
  );
};

export default BestSellersRail;
