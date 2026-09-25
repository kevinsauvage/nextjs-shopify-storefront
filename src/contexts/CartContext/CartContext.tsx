'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  addCartLinesAction,
  getCartAction,
  removeCartLineAction,
  removeGiftCardCodeAction,
  updateCartAttributesAction,
  updateCartLinesAction,
  updateCartNoteAction,
  updateDiscountCodesAction,
  updateGiftCardCodesAction,
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
  removeGiftCardCode: (appliedGiftCardId: string) => Promise<void>;
  setCart: (cart: CartFieldsFragment) => void;
  updateAttributes: (attributes: Array<{ key: string; value: string }>) => Promise<void>;
  updateDiscountCodes: (discountCodes: string[]) => Promise<void>;
  updateGiftCardCodes: (giftCardCodes: string[]) => Promise<void>;
  updateNote: (note: string) => Promise<void>;
}

export const CartContext = createContext<CartContextType>({
  cart: null,
  error: null,
  isLoading: true,
  handleAddToCart: async () => {},
  handleQuantityChange: async () => {},
  removeFromCart: async () => {},
  removeGiftCardCode: async () => {},
  setCart: () => {},
  updateAttributes: async () => {},
  updateDiscountCodes: async () => {},
  updateGiftCardCodes: async () => {},
  updateNote: async () => {},
});

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  return error instanceof Error ? error.message : defaultMessage;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCartState] = useState<CartFieldsFragment | null>(null);
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
        if (!cancelled) setCartState(initialCart);
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
    setCartState(response.data);
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

  const removeGiftCardCode = useCallback(
    async (appliedGiftCardId: string) => {
      if (!appliedGiftCardId) {
        reportError('cart/gift-card-remove', new Error('Missing gift card ID'));
        return;
      }

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await removeGiftCardCodeAction(appliedGiftCardId);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(
          requestId,
          'cart/gift-card-remove',
          caughtError,
          'Failed to remove gift card',
        );
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

  const updateGiftCardCodes = useCallback(
    async (giftCardCodes: string[]) => {
      if (!Array.isArray(giftCardCodes)) {
        reportError('cart/gift-card', new Error('Invalid gift card codes format'));
        return;
      }

      const validCodes = giftCardCodes
        .map((code) => String(code).trim())
        .filter((code) => code.length > 0);

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await updateGiftCardCodesAction(validCodes);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(
          requestId,
          'cart/gift-card',
          caughtError,
          'Failed to update gift cards',
        );
      }
    },
    [handleMutationError, handleResponse],
  );

  const updateNote = useCallback(
    async (note: string) => {
      if (typeof note !== 'string') {
        reportError('cart/note', new Error('Invalid order note format'));
        return;
      }

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await updateCartNoteAction(note);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(requestId, 'cart/note', caughtError, 'Failed to save order note');
      }
    },
    [handleMutationError, handleResponse],
  );

  const updateAttributes = useCallback(
    async (attributes: Array<{ key: string; value: string }>) => {
      if (!Array.isArray(attributes)) {
        reportError('cart/attributes', new Error('Invalid cart attributes format'));
        return;
      }

      const requestId = (requestIdRef.current += 1);
      try {
        const response = await updateCartAttributesAction(attributes);
        handleResponse(requestId, response);
      } catch (caughtError) {
        handleMutationError(requestId, 'cart/attributes', caughtError, 'Failed to update cart');
      }
    },
    [handleMutationError, handleResponse],
  );

  // Adopt a cart returned by a mutation outside this context (move-to-cart).
  const setCart = useCallback((nextCart: CartFieldsFragment) => {
    setCartState(nextCart);
    setError(null);
  }, []);

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      error,
      isLoading,
      handleAddToCart,
      handleQuantityChange,
      removeFromCart,
      removeGiftCardCode,
      setCart,
      updateAttributes,
      updateDiscountCodes,
      updateGiftCardCodes,
      updateNote,
    }),
    [
      cart,
      error,
      isLoading,
      handleAddToCart,
      handleQuantityChange,
      removeFromCart,
      removeGiftCardCode,
      setCart,
      updateAttributes,
      updateDiscountCodes,
      updateGiftCardCodes,
      updateNote,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
