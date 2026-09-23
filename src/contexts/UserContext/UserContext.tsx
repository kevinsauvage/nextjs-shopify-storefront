'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { getSessionAction } from '@/actions/sessionActions';
import {
  addToWishlistAction,
  getWishlistIdsAction,
  removeFromWishlistAction,
} from '@/actions/wishlistActions';
import config from '@/config';

import { toast } from 'sonner';

type UserContextValue = {
  handleSetWishlist: (isWishlisted: boolean, productId: string) => Promise<void>;
  isLoggedIn: boolean;
  wishlistIds: string[];
  wishlistReady: boolean;
};

export const UserContext = createContext<UserContextValue>({
  handleSetWishlist: async () => {
    // noop
  },
  isLoggedIn: false,
  wishlistIds: [],
  wishlistReady: false,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistLoaded, setWishlistLoaded] = useState(false);

  // The session lives in an httpOnly cookie, so it is resolved client-side to
  // keep the root layout (and the catalog) statically renderable. Re-checking on
  // navigation keeps the header correct right after login/logout redirects.
  useEffect(() => {
    let cancelled = false;

    getSessionAction()
      .then((loggedIn) => {
        if (cancelled) return;
        setIsLoggedIn(loggedIn);
      })
      .catch((error) => {
        console.error('Failed to resolve session:', error);
      })
      // Always resolve, even on failure, so the UI never stays in a loading state.
      .finally(() => {
        if (cancelled) return;
        setSessionResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Load wishlist ids client-side so the root layout does not block every page
  // render on a customer-specific Shopify request.
  useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    getWishlistIdsAction()
      .then((ids) => {
        if (cancelled) return;
        setWishlistIds(ids);
      })
      .catch((error) => {
        console.error('Failed to load wishlist:', error);
      })
      // Always mark as loaded so a failure cannot pin the wishlist in a skeleton.
      .finally(() => {
        if (cancelled) return;
        setWishlistLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleSetWishlist = useCallback(
    async (isWishlisted: boolean, productId: string) => {
      if (!isLoggedIn) {
        toast.info('You need to login to add products to your wishlist');
        router.push(`${config.routes.login}?redirect=${pathname}`);
        return;
      }

      const previousIds = wishlistIds;
      // Update optimistically; revert if the write fails.
      setWishlistIds(
        isWishlisted ? previousIds.filter((id) => id !== productId) : [...previousIds, productId],
      );

      try {
        const result = isWishlisted
          ? await removeFromWishlistAction(productId)
          : await addToWishlistAction(productId);

        if (result?.success && result.data) {
          setWishlistIds(result.data);
          toast.success(result.message);
        } else {
          setWishlistIds(previousIds);
          toast.error(result?.message || 'Something went wrong');
        }
      } catch (error) {
        setWishlistIds(previousIds);
        console.error('Wishlist operation error:', error);
        toast.error('Something went wrong');
      }
    },
    [isLoggedIn, pathname, router, wishlistIds],
  );

  const values = useMemo(
    () => ({
      handleSetWishlist,
      isLoggedIn,
      // Never expose a stale wishlist once the session ends.
      wishlistIds: isLoggedIn ? wishlistIds : [],
      wishlistReady: sessionResolved && (!isLoggedIn || wishlistLoaded),
    }),
    [handleSetWishlist, isLoggedIn, sessionResolved, wishlistIds, wishlistLoaded],
  );

  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
