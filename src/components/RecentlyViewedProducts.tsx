'use client';

import { useEffect, useState } from 'react';

import { getProductsByIdsAction } from '@/actions/productsActions';
import HomeSection from '@/app/_components/HomeSection';
import { useLocalList } from '@/hooks/useLocalList';
import { RECENTLY_VIEWED_KEY, RECENTLY_VIEWED_MAX } from '@/lib/client/recentlyViewed';
import { reportError } from '@/lib/logger';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import ProductRail from './ProductRail';

/**
 * Product rail built from the device's recently-viewed IDs. The IDs come from
 * `useLocalList` (hydration-safe) and are resolved to products through a Server
 * Action. Renders nothing — heading included — until there is something to show.
 */
const RecentlyViewedProducts = ({
  excludeId,
  limit = 8,
}: {
  /** Skip the product currently being viewed. */
  excludeId?: string;
  limit?: number;
}) => {
  const [products, setProducts] = useState<ProductFieldsFragment[]>([]);
  const viewedIds = useLocalList(RECENTLY_VIEWED_KEY, RECENTLY_VIEWED_MAX);

  useEffect(() => {
    const ids = viewedIds.filter((id) => id !== excludeId).slice(0, limit);

    if (ids.length === 0) return;

    let cancelled = false;

    getProductsByIdsAction(ids)
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((error) => {
        reportError('RecentlyViewedProducts', error);
      });

    return () => {
      cancelled = true;
    };
  }, [viewedIds, excludeId, limit]);

  if (products.length === 0) return null;

  return (
    <section className="border-t border-border/60">
      <div className="container mx-auto px-4 md:px-6">
        <HomeSection eyebrow="Your history" title="Recently viewed">
          <ProductRail products={products} />
        </HomeSection>
      </div>
    </section>
  );
};

export default RecentlyViewedProducts;
