'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  addCartLinesAction,
  getCartAction,
  removeCartLineAction,
  updateCartLinesAction,
  updateDiscountCodesAction,
} from '@/actions/cartActions';
import config from '@/config';
import { getCookieFront } from '@/lib/client/cookies';
import { reportError } from '@/lib/logger';
import type { CartFieldsFragment } from '@/shopify/storefront';

import { toast } from 'sonner';

type CartResponse = { data: CartFieldsFragment; message?: string };

interface CartContextType {
  cart: CartFieldsFragment | null;
  error: string | null;
  isLoading: boolean;
  handleAddToCart: (variantId: string, quantity?: number) => Promise<void>;
  handleQuantityChange: (id: string, quantity: number) => Promise<void>;
  removeFromCart: (lineItemId: string) => Promise<void>;
  updateDiscountCodes: (discountCodes: string[]) => Promise<void>;
}

export const CartContext = createContext<CartContextType>({
  cart: null,
  error: null,
  isLoading: true,
  handleAddToCart: async () => {},
  handleQuantityChange: async () => {},
  removeFromCart: async () => {},
  updateDiscountCodes: async () => {},
});

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  return error instanceof Error ? error.message : defaultMessage;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartFieldsFragment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Monotonic id so concurrent mutations cannot resolve out of order: only
  // the latest response may write the cart; stale ones are dropped. (The
  // same pattern already guards predictive search in `Search.tsx`.)
  const requestIdRef = useRef(0);

  // The cart id lives in an httpOnly cookie, so the cart is hydrated client-side
  // to keep the root layout (and the catalog) statically renderable. A cart is
  // created on demand by the first mutation, never here.
  useEffect(() => {
    let cancelled = false;

    // No readable marker → no cookie-backed cart exists yet, so skip the
    // server-action round-trip entirely on a first visit.
    const hasCart = Boolean(getCookieFront(config.cookies.cartPresent));

    (hasCart ? getCartAction() : Promise.resolve(null))
      .then((initialCart) => {
        if (!cancelled) setCart(initialCart);
      })
      .catch((loadError) => {
        if (cancelled) return;
        const message = getErrorMessage(loadError, 'Failed to load your cart');
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleResponse = useCallback((requestId: number, response: CartResponse) => {
    if (requestId !== requestIdRef.current) return;
    setCart(response.data);
    setError(null);
    if (response.message) {
      toast.success(response.message);
    }
  }, []);

  const handleMutationError = useCallback(
    (requestId: number, context: string, caughtError: unknown, fallbackMessage: string) => {
      if (requestId !== requestIdRef.current) return;
      reportError(context, caughtError);
      toast.error(getErrorMessage(caughtError, fallbackMessage));
    },
    [],
  );

  const removeFromCart = useCallback(
    async (lineItemId: string) => {
      if (!lineItemId) {
        reportError('cart/remove', new Error('Missing line item ID'));
        return;
      }

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await removeCartLineAction(lineItemId);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(requestId, 'cart/remove', caughtError, 'Failed to remove item');
      }
    },
    [handleMutationError, handleResponse],
  );

  const handleQuantityChange = useCallback(
    async (id: string, quantity: number) => {
      if (!id || !quantity) {
        reportError('cart/quantity', new Error('Missing required parameters: id or quantity'));
        return;
      }

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await updateCartLinesAction([{ id, quantity }]);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(requestId, 'cart/quantity', caughtError, 'Failed to update cart');
      }
    },
    [handleMutationError, handleResponse],
  );

  const handleAddToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      if (!variantId) {
        reportError('cart/add', new Error('Missing variant ID'));
        return;
      }

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await addCartLinesAction([{ merchandiseId: variantId, quantity }]);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(requestId, 'cart/add', caughtError, 'Failed to add to cart');
      }
    },
    [handleMutationError, handleResponse],
  );

  const updateDiscountCodes = useCallback(
    async (discountCodes: string[]) => {
      if (!Array.isArray(discountCodes)) {
        reportError('cart/discount', new Error('Invalid discount codes format'));
        return;
      }

      const validCodes = discountCodes
        .map((code) => String(code).trim())
        .filter((code) => code.length > 0);

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await updateDiscountCodesAction(validCodes);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(
          requestId,
          'cart/discount',
          caughtError,
          'Failed to update discount codes',
        );
      }
    },
    [handleMutationError, handleResponse],
  );

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      error,
      isLoading,
      handleAddToCart,
      handleQuantityChange,
      removeFromCart,
      updateDiscountCodes,
    }),
    [
      cart,
      error,
      isLoading,
      handleAddToCart,
      handleQuantityChange,
      removeFromCart,
      updateDiscountCodes,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
