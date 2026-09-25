'use client';

import {
  createContext,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  mergeWishlistAction,
  moveWishlistToCartAction,
  setWishlistMembershipAction,
} from '@/actions/wishlistActions';
import config from '@/config';
import { useLocalList } from '@/hooks/useLocalList';
import { getCookieFront } from '@/lib/client/cookies';
import {
  addGuestWishlist,
  clearGuestWishlist,
  GUEST_WISHLIST_KEY,
  GUEST_WISHLIST_MAX,
  readGuestWishlist,
  removeGuestWishlist,
} from '@/lib/client/guestWishlist';
import { reportError } from '@/lib/logger';
import { mergeWishlistIds } from '@/lib/wishlist';
import type { CartFieldsFragment } from '@/shopify/storefront';

import { toast } from 'sonner';

/** Client-side fallback toast copy for wishlist failures. */
const TOAST_ERROR = 'Something went wrong';

type UserContextValue = {
  handleSetWishlist: (isWishlisted: boolean, productId: string) => Promise<void>;
  /** Move the given wishlisted products to the cart. Resolves when done. */
  handleMoveToCart: (productIds: string[]) => Promise<CartFieldsFragment | null>;
  isLoggedIn: boolean;
  /** Product IDs with an in-flight wishlist write. Cards derive their loading
   * state from this; the optimistic `wishlistIds` above already flips instantly. */
  pendingWishlistIds: string[];
  wishlistIds: string[];
  wishlistReady: boolean;
};

export const UserContext = createContext<UserContextValue>({
  handleSetWishlist: async () => {
    // noop
  },
  handleMoveToCart: async () => null,
  isLoggedIn: false,
  pendingWishlistIds: [],
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
  // In-flight wishlist writes by product ID. Set outside the transition so the
  // very next render already disables the toggle; cleared in the `finally`
  // below, which runs at true completion (unlike the `startTransition` call
  // itself, which only schedules the work).
  const [pendingWishlistIds, setPendingWishlistIds] = useState<string[]>([]);

  // Device-local guest wishlist. `useLocalList` is hydration-safe and keeps the
  // value in sync across tabs, so a signed-out toggle re-renders instantly.
  const guestIds = useLocalList(GUEST_WISHLIST_KEY, GUEST_WISHLIST_MAX);

  // Guards the one-time login merge so a re-render (or a navigation) cannot
  // run it twice and double-fire the "saved to your account" toast.
  const mergedRef = useRef(false);

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
    setIsLoggedIn(getCookieFront(config.cookies.sessionPresent) !== '');
    setSessionResolved(true);
  }, [pathname]);

  // Signed out (or after logout): reset in-memory ids and the merge guard so
  // the next login re-merges. The UI falls back to the device-local list.
  useEffect(() => {
    if (isLoggedIn) return;
    mergedRef.current = false;
    setWishlistIds([]);
    setWishlistLoaded(false);
    setPendingWishlistIds([]);
  }, [isLoggedIn]);

  // One-time guest → account merge on first sign-in (union; see mergeWishlistIds).
  useEffect(() => {
    if (!isLoggedIn || mergedRef.current) return;

    mergedRef.current = true;
    const localIds = readGuestWishlist();

    let cancelled = false;

    setPendingWishlistIds(localIds);

    mergeWishlistAction(localIds)
      .then((result) => {
        if (cancelled) return;
        setWishlistIds(result.success && result.data ? result.data : []);
        // Clear the device list only once the merge is durable server-side.
        if (result.success) clearGuestWishlist();
        if (result.success && result.message) toast.success(result.message);
      })
      .catch((error) => {
        if (cancelled) return;
        reportError('wishlist/merge', error);
      })
      .finally(() => {
        if (cancelled) return;
        setPendingWishlistIds([]);
        setWishlistLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handleSetWishlist = useCallback(
    async (isWishlisted: boolean, productId: string) => {
      // Signed out: toggle the device-local list, no server round-trip.
      if (!isLoggedIn) {
        if (isWishlisted) {
          removeGuestWishlist(productId);
          toast.success('Product removed from wishlist');
        } else {
          addGuestWishlist(productId);
          toast.success('Product added to wishlist');
        }
        return;
      }

      // Optimistic toggle with automatic rollback: the optimistic layer is
      // discarded whenever the base state commits, so a failed write reverts
      // to the *latest* ids instead of a stale closure snapshot. This fixes
      // the lost-update bug where two rapid toggles rolled back to the same
      // list. No `wishlistIds` dependency → stable identity, no grid
      // re-render per toggle.
      //
      // The returned promise resolves at true completion (not when the
      // transition is scheduled): callers can `await` the toggle, and
      // `pendingWishlistIds` covers the flight for callers that don't.
      setPendingWishlistIds((previous) =>
        previous.includes(productId) ? previous : [...previous, productId],
      );

      return new Promise<void>((resolve) => {
        startTransition(async () => {
          addOptimisticWishlist({ isWishlisted, productId });

          try {
            const result = await setWishlistMembershipAction(isWishlisted, productId);

            if (result?.success && result.data) {
              setWishlistIds(result.data);
              toast.success(result.message);
            } else {
              toast.error(result?.message || TOAST_ERROR);
            }
          } catch (error) {
            reportError('wishlist/toggle', error, { productId });
            toast.error(TOAST_ERROR);
          } finally {
            setPendingWishlistIds((previous) => previous.filter((id) => id !== productId));
            resolve();
          }
        });
      });
    },
    [isLoggedIn],
  );

  const handleMoveToCart = useCallback(
    async (productIds: string[]): Promise<CartFieldsFragment | null> => {
      if (!isLoggedIn) {
        toast.info('You need to login to move items to your cart');
        router.push(config.routes.login);
        return null;
      }

      if (productIds.length === 0) return null;

      setPendingWishlistIds(productIds);

      try {
        const result = await moveWishlistToCartAction(productIds);

        if (!result.success || !result.cart) {
          toast.error(result.message || TOAST_ERROR);
          return null;
        }

        setWishlistIds(result.data ?? []);
        toast.success(result.message);
        return result.cart;
      } catch (error) {
        reportError('wishlist/move-to-cart', error);
        toast.error(TOAST_ERROR);
        return null;
      } finally {
        setPendingWishlistIds([]);
      }
    },
    [isLoggedIn, router],
  );

  const values = useMemo(() => {
    // Signed in: show the guest union until the merge commits, then the server ids.
    const visibleWishlistIds = isLoggedIn
      ? wishlistLoaded
        ? optimisticWishlistIds
        : mergeWishlistIds([], guestIds)
      : guestIds;

    return {
      handleSetWishlist,
      handleMoveToCart,
      isLoggedIn,
      pendingWishlistIds,
      wishlistIds: visibleWishlistIds,
      // Signed in: wait for the login merge so the list does not flash empty.
      wishlistReady: sessionResolved && (!isLoggedIn || wishlistLoaded),
    };
  }, [
    guestIds,
    handleMoveToCart,
    handleSetWishlist,
    isLoggedIn,
    optimisticWishlistIds,
    pendingWishlistIds,
    sessionResolved,
    wishlistLoaded,
  ]);

  return (
    <UserContext.Provider value={values}>
      <Suspense fallback={null}>
        <PathnameWatcher onChange={setPathname} />
      </Suspense>
      {children}
    </UserContext.Provider>
  );
};
