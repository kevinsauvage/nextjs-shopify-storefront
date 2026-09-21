'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  addCartLinesAction,
  getCartAction,
  removeCartLineAction,
  updateCartLinesAction,
  updateDiscountCodesAction,
} from '@/actions/cartActions';
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

  // The cart id lives in an httpOnly cookie, so the cart is hydrated client-side
  // to keep the root layout (and the catalog) statically renderable. A cart is
  // created on demand by the first mutation, never here.
  useEffect(() => {
    let cancelled = false;

    getCartAction()
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

  const handleResponse = useCallback((response: CartResponse) => {
    setCart(response.data);
    setError(null);
    if (response.message) {
      toast.success(response.message);
    }
  }, []);

  const removeFromCart = useCallback(
    async (lineItemId: string) => {
      if (!lineItemId) {
        console.error('Missing line item ID');
        return;
      }

      try {
        const response = await removeCartLineAction(lineItemId);
        handleResponse(response);
      } catch (caughtError) {
        toast.error(getErrorMessage(caughtError, 'Failed to remove item'));
      }
    },
    [handleResponse],
  );

  const handleQuantityChange = useCallback(
    async (id: string, quantity: number) => {
      if (!id || !quantity) {
        console.error('Missing required parameters: id or quantity');
        return;
      }

      try {
        const response = await updateCartLinesAction([{ id, quantity }]);
        handleResponse(response);
      } catch (caughtError) {
        toast.error(getErrorMessage(caughtError, 'Failed to update cart'));
      }
    },
    [handleResponse],
  );

  const handleAddToCart = useCallback(
    async (variantId: string, quantity = 1) => {
      if (!variantId) {
        console.error('Missing variant ID');
        return;
      }

      try {
        const response = await addCartLinesAction([{ merchandiseId: variantId, quantity }]);
        handleResponse(response);
      } catch (caughtError) {
        toast.error(getErrorMessage(caughtError, 'Failed to add to cart'));
      }
    },
    [handleResponse],
  );

  const updateDiscountCodes = useCallback(
    async (discountCodes: string[]) => {
      if (!Array.isArray(discountCodes)) {
        console.error('Invalid discount codes format');
        return;
      }

      const validCodes = discountCodes
        .map((code) => String(code).trim())
        .filter((code) => code.length > 0);

      try {
        const response = await updateDiscountCodesAction(validCodes);
        handleResponse(response);
      } catch (caughtError) {
        toast.error(getErrorMessage(caughtError, 'Failed to update discount codes'));
      }
    },
    [handleResponse],
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
    [cart, error, isLoading, handleAddToCart, handleQuantityChange, removeFromCart, updateDiscountCodes],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
