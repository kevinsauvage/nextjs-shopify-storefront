'use client';

import {
  createContext,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { getWishlistIdsAction, setWishlistMembershipAction } from '@/actions/wishlistActions';
import config from '@/config';
import { getCookieFront } from '@/lib/client/cookies';
import { reportError } from '@/lib/logger';

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

/**
 * Reports the current pathname to the provider. `usePathname()` suspends on
 * routes whose dynamic params are unknown at build time, so it lives in its own
 * component under a `<Suspense>` boundary to keep the app shell prerenderable.
 */
const PathnameWatcher = ({ onChange }: { onChange: (pathname: string) => void }) => {
  const pathname = usePathname();

  useEffect(() => {
    onChange(pathname);
  }, [pathname, onChange]);

  return null;
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [pathname, setPathname] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistLoaded, setWishlistLoaded] = useState(false);

  // Optimistic view over the last server-confirmed ids. Updated inside a
  // transition before the write lands; React discards it automatically when
  // `wishlistIds` commits, so failures revert without a captured snapshot.
  const [optimisticWishlistIds, addOptimisticWishlist] = useOptimistic(
    wishlistIds,
    (state: string[], { isWishlisted, productId }: { isWishlisted: boolean; productId: string }) =>
      isWishlisted
        ? state.filter((id) => id !== productId)
        : state.includes(productId)
          ? state
          : [...state, productId],
  );

  // The session lives in an httpOnly cookie, so it is resolved client-side to
  // keep the root layout (and the catalog) statically renderable.
  //
  // Single source of truth: the readable marker, written and cleared atomically
  // with the token (login/register/reset, renewal, logout, stale-session
  // cleanup). Re-read on every navigation — a plain cookie read, zero server
  // round-trips. Sessions predating the marker are minted one by the proxy on
  // the next origin hit, so they self-heal.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing external cookie state on navigation
    setIsLoggedIn(getCookieFront(config.cookies.sessionPresent) !== '');
    setSessionResolved(true);
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
        reportError('wishlist/load', error);
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
        const returnTo = typeof window === 'undefined' ? pathname : window.location.pathname;
        router.push(`${config.routes.login}?redirect=${returnTo}`);
        return;
      }

      // Optimistic toggle with automatic rollback: the optimistic layer is
      // discarded whenever the base state commits, so a failed write reverts
      // to the *latest* ids instead of a stale closure snapshot. This fixes
      // the lost-update bug where two rapid toggles rolled back to the same
      // list. No `wishlistIds` dependency → stable identity, no grid
      // re-render per toggle.
      startTransition(async () => {
        addOptimisticWishlist({ isWishlisted, productId });

        try {
          const result = await setWishlistMembershipAction(isWishlisted, productId);

          if (result?.success && result.data) {
            setWishlistIds(result.data);
            toast.success(result.message);
          } else {
            toast.error(result?.message || 'Something went wrong');
          }
        } catch (error) {
          reportError('wishlist/toggle', error, { productId });
          toast.error('Something went wrong');
        }
      });
    },
    [addOptimisticWishlist, isLoggedIn, pathname, router],
  );

  const values = useMemo(
    () => ({
      handleSetWishlist,
      isLoggedIn,
      // Never expose a stale wishlist once the session ends.
      wishlistIds: isLoggedIn ? optimisticWishlistIds : [],
      wishlistReady: sessionResolved && (!isLoggedIn || wishlistLoaded),
    }),
    [handleSetWishlist, isLoggedIn, optimisticWishlistIds, sessionResolved, wishlistLoaded],
  );

  return (
    <UserContext.Provider value={values}>
      <Suspense fallback={null}>
        <PathnameWatcher onChange={setPathname} />
      </Suspense>
      {children}
    </UserContext.Provider>
  );
};
