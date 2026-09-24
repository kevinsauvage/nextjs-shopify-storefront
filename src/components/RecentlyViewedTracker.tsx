'use client';

import { useEffect } from 'react';

import { addRecentlyViewed } from '@/lib/client/recentlyViewed';

/**
 * Records a product view in device-local storage. Renders nothing; mounted on
 * the product page so the recently-viewed rail can populate.
 */
const RecentlyViewedTracker = ({ productId }: { productId: string }) => {
  useEffect(() => {
    addRecentlyViewed(productId);
  }, [productId]);

  return null;
};

export default RecentlyViewedTracker;
