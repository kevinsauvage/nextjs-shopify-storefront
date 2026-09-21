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

export async function createCartAction(): Promise<CartFieldsFragment> {
  return CartService.createCart();
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
