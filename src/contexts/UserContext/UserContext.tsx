'use client';

import { createContext, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { getSessionAction } from '@/actions/sessionActions';
import {
  addToWishlistAction,
  getWishlistIdsAction,
  removeFromWishlistAction,
} from '@/actions/wishlistActions';
import config from '@/config';
import { getCookieFront } from '@/lib/client/cookies';

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
  // Last readable session marker we resolved against. Lets a navigation re-check
  // cheaply: only a marker change (login/logout/renewal) triggers the server
  // action, so ordinary navigations never POST.
  const lastSessionMarker = useRef<string | null>(null);

  // The session lives in an httpOnly cookie, so it is resolved client-side to
  // keep the root layout (and the catalog) statically renderable. The readable
  // marker is set/cleared alongside the token, so a missing marker is a
  // definitive "signed out" without a round-trip, and a changed marker is the
  // only time the session is re-resolved.
  useEffect(() => {
    const marker = getCookieFront(config.cookies.sessionPresent);

    if (!marker) {
      if (lastSessionMarker.current === '') return;
      lastSessionMarker.current = '';
      // Resolve in a microtask so the effect body itself stays free of
      // synchronous state updates (avoids cascading renders).
      Promise.resolve().then(() => {
        setIsLoggedIn(false);
        setSessionResolved(true);
      });
      return;
    }

    if (lastSessionMarker.current === marker) return;

    let cancelled = false;
    lastSessionMarker.current = marker;

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
        const returnTo = typeof window === 'undefined' ? pathname : window.location.pathname;
        router.push(`${config.routes.login}?redirect=${returnTo}`);
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

  return (
    <UserContext.Provider value={values}>
      <Suspense fallback={null}>
        <PathnameWatcher onChange={setPathname} />
      </Suspense>
      {children}
    </UserContext.Provider>
  );
};
