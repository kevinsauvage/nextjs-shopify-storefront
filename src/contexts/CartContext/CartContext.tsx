'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import {
  addCartLinesAction,
  createCartAction,
  removeCartLineAction,
  updateCartLinesAction,
  updateDiscountCodesAction,
} from '@/actions/cartActions';
import cartMock from '@/mocks/cart';
import type { CartFieldsFragment } from '@/shopify/storefront';

import { toast } from 'sonner';

type CartResponse = { data: CartFieldsFragment; message?: string };

interface CartContextType {
  cart: CartFieldsFragment;
  handleAddToCart: (variantId: string, quantity?: number) => Promise<void>;
  handleQuantityChange: (id: string, quantity: number) => Promise<void>;
  removeFromCart: (lineItemId: string) => Promise<void>;
  updateDiscountCodes: (discountCodes: string[]) => Promise<void>;
}

export const CartContext = createContext<CartContextType>({
  cart: {} as CartFieldsFragment,
  handleAddToCart: async () => {},
  handleQuantityChange: async () => {},
  removeFromCart: async () => {},
  updateDiscountCodes: async () => {},
});

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  return error instanceof Error ? error.message : defaultMessage;
};

export const CartProvider = ({
  children,
  initialCart,
}: {
  children: React.ReactNode;
  initialCart: CartFieldsFragment | null;
}) => {
  const [cart, setCart] = useState<CartFieldsFragment>(initialCart || cartMock);

  useEffect(() => {
    if (!initialCart) {
      createCartAction()
        .then(setCart)
        .catch((error) => {
          console.error('Failed to create cart:', error);
          toast.error('Failed to initialize cart');
        });
    }
  }, [initialCart]);

  const handleResponse = useCallback((response: CartResponse) => {
    setCart(response.data);
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
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to remove item'));
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
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to update cart'));
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
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to add to cart'));
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
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to update discount codes'));
      }
    },
    [handleResponse],
  );

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      handleAddToCart,
      handleQuantityChange,
      removeFromCart,
      updateDiscountCodes,
    }),
    [cart, handleAddToCart, handleQuantityChange, removeFromCart, updateDiscountCodes],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
