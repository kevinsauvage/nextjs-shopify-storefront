'use server';

import { getClientIp, rateLimitKey } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { CartService } from '@/services/cart.service';
import type { CartFieldsFragment, CartLineInput, CartLineUpdateInput } from '@/shopify/storefront';
import { shopifyGidField } from '@/utils/validation';

import { z } from 'zod';

export type CartActionResult = {
  data: CartFieldsFragment;
  message?: string;
};

const MAX_LINES_PER_REQUEST = 50;
const MAX_QUANTITY = 99;
const MAX_DISCOUNT_CODES = 20;

const quantitySchema = z.number().int().min(1).max(MAX_QUANTITY);

const addLinesSchema = z
  .array(
    z.object({
      merchandiseId: shopifyGidField,
      quantity: quantitySchema,
    }),
  )
  .min(1)
  .max(MAX_LINES_PER_REQUEST);

const updateLinesSchema = z
  .array(
    z.object({
      id: shopifyGidField,
      quantity: quantitySchema,
    }),
  )
  .min(1)
  .max(MAX_LINES_PER_REQUEST);

const lineIdSchema = shopifyGidField;

const discountCodesSchema = z.array(z.string().trim().min(1).max(64)).max(MAX_DISCOUNT_CODES);

/** Throttle public cart writes per client IP (plus cart id when known). Fail closed: cart writes burn Storefront quota, so an Upstash outage must deny writes rather than allow unlimited mutations. */
const assertNotRateLimited = async (): Promise<void> => {
  const [ip, cartId] = await Promise.all([getClientIp(), CartService.getCartId()]);
  if (
    await isRateLimited('cart:write', rateLimitKey(ip, cartId), 60, '1 m', { failClosed: true })
  ) {
    throw new Error('Too many cart updates. Please slow down and try again.');
  }
};

/**
 * Read the current cart for client-side hydration. Returns `null` only when
 * there is no cart yet. Transient/network failures throw so the UI can surface
 * the outage instead of showing a silently empty cart.
 */
export async function getCartAction(): Promise<CartFieldsFragment | null> {
  const cartId = await CartService.getCartId();

  if (!cartId) return null;

  return CartService.getCart(cartId);
}

export async function addCartLinesAction(lines: CartLineInput[]): Promise<CartActionResult> {
  const parsed = addLinesSchema.safeParse(lines);
  if (!parsed.success) {
    throw new Error('Invalid cart item');
  }

  await assertNotRateLimited();

  const cart = await CartService.addLines(parsed.data);
  return { data: cart, message: 'Product added successfully' };
}

export async function updateCartLinesAction(
  lines: CartLineUpdateInput[],
): Promise<CartActionResult> {
  const parsed = updateLinesSchema.safeParse(lines);
  if (!parsed.success) {
    throw new Error('Invalid cart update');
  }

  await assertNotRateLimited();

  const cart = await CartService.updateLines(parsed.data);
  return { data: cart, message: 'Cart updated successfully' };
}

export async function removeCartLineAction(lineId: string): Promise<CartActionResult> {
  const parsed = lineIdSchema.safeParse(lineId);
  if (!parsed.success) {
    throw new Error('Invalid cart line');
  }

  await assertNotRateLimited();

  const cart = await CartService.removeLine(parsed.data);
  return { data: cart, message: 'Product removed successfully' };
}

export async function updateDiscountCodesAction(
  discountCodes: string[],
): Promise<CartActionResult> {
  const parsed = discountCodesSchema.safeParse(discountCodes);
  if (!parsed.success) {
    throw new Error('Invalid discount code');
  }

  await assertNotRateLimited();

  const cart = await CartService.updateDiscountCodes(parsed.data);
  return { data: cart, message: 'Discount codes updated successfully' };
}
