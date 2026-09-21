'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  addToWishlistAction,
  getWishlistAction,
  removeFromWishlistAction,
} from '@/actions/wishlistActions';
import config from '@/config';
import type { ProductFieldsFragment } from '@/shopify/storefront';

import { toast } from 'sonner';

type UserContextValue = {
  handleSetWishlist: (isWishlisted: boolean, product: ProductFieldsFragment) => Promise<void>;
  isLoggedIn: boolean;
  userWishlist: ProductFieldsFragment[];
};

export const UserContext = createContext<UserContextValue>({
  handleSetWishlist: async () => {
    // noop
  },
  isLoggedIn: false,
  userWishlist: [],
});

export const UserProvider = ({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userWishlist, setUserWishlist] = useState<ProductFieldsFragment[]>([]);

  // Load the wishlist client-side so the root layout does not block every page
  // render on a customer-specific Shopify request.
  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    getWishlistAction()
      .then((items) => {
        if (!cancelled) setUserWishlist(items);
      })
      .catch((error) => {
        console.error('Failed to load wishlist:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleSetWishlist = useCallback(
    async (isWishlisted: boolean, product: ProductFieldsFragment) => {
      if (!isLoggedIn) {
        toast.info('You need to login to add products to your wishlist');
        router.push(`${config.routes.login}?redirect=${pathname}`);
        return;
      }

      try {
        const result = isWishlisted
          ? await removeFromWishlistAction(product.id)
          : await addToWishlistAction(product.id);

        if (result?.success && result.data) {
          setUserWishlist(result.data);
          toast.success(result.message);
          router.refresh();
        } else {
          toast.error(result?.message || 'Something went wrong');
        }
      } catch (error) {
        console.error('Wishlist operation error:', error);
        toast.error(error instanceof Error ? error.message : 'Something went wrong');
      }
    },
    [isLoggedIn, pathname, router],
  );

  const values = useMemo(
    () => ({ handleSetWishlist, isLoggedIn, userWishlist }),
    [handleSetWishlist, isLoggedIn, userWishlist],
  );

  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
