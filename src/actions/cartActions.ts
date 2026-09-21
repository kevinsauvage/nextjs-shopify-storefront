'use server';

import { CartService } from '@/services/cart.service';
import type {
  CartFieldsFragment,
  CartLineInput,
  CartLineUpdateInput,
} from '@/shopify/storefront';

export type CartActionResult = {
  data: CartFieldsFragment;
  message?: string;
};

/**
 * Read the current cart for client-side hydration. Returns `null` when there is
 * no cart yet or Shopify is temporarily unavailable; it never creates a cart or
 * clears the stored id.
 */
export async function getCartAction(): Promise<CartFieldsFragment | null> {
  const cartId = await CartService.getCartId();

  if (!cartId) return null;

  try {
    return await CartService.getCart(cartId);
  } catch {
    return null;
  }
}

export async function addCartLinesAction(lines: CartLineInput[]): Promise<CartActionResult> {
  const cart = await CartService.addLines(lines);
  return { data: cart, message: 'Product added successfully' };
}

export async function updateCartLinesAction(
  lines: CartLineUpdateInput[],
): Promise<CartActionResult> {
  const cart = await CartService.updateLines(lines);
  return { data: cart, message: 'Cart updated successfully' };
}

export async function removeCartLineAction(lineId: string): Promise<CartActionResult> {
  const cart = await CartService.removeLine(lineId);
  return { data: cart, message: 'Product removed successfully' };
}

export async function updateDiscountCodesAction(
  discountCodes: string[],
): Promise<CartActionResult> {
  const cart = await CartService.updateDiscountCodes(discountCodes);
  return { data: cart, message: 'Discount codes updated successfully' };
}
