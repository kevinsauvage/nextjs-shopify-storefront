'use server';

import { getOrderById } from '@/lib/server/account';
import { getClientIp, rateLimitKey } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
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

const giftCardCodesSchema = z.array(z.string().trim().min(1).max(64)).max(MAX_DISCOUNT_CODES);

const cartNoteSchema = z.string().trim().max(2000);

const MAX_ATTRIBUTES = 10;

const cartAttributesSchema = z
  .array(
    z.object({
      key: z.string().trim().min(1).max(64),
      value: z.string().trim().max(1024),
    }),
  )
  .max(MAX_ATTRIBUTES);

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

export async function updateGiftCardCodesAction(
  giftCardCodes: string[],
): Promise<CartActionResult> {
  const parsed = giftCardCodesSchema.safeParse(giftCardCodes);
  if (!parsed.success) {
    throw new Error('Invalid gift card code');
  }

  await assertNotRateLimited();

  const cart = await CartService.updateGiftCardCodes(parsed.data);

  // Shopify silently ignores unrecognized codes (no userErrors, nothing
  // applied), so an empty applied list after sending codes means the code
  // was not recognized — surface it instead of reporting success.
  if (parsed.data.length > 0 && cart.appliedGiftCards.length === 0) {
    throw new Error('That gift card code was not recognized');
  }

  return { data: cart, message: 'Gift cards updated successfully' };
}

const appliedGiftCardIdSchema = shopifyGidField;

export async function removeGiftCardCodeAction(
  appliedGiftCardId: string,
): Promise<CartActionResult> {
  const parsed = appliedGiftCardIdSchema.safeParse(appliedGiftCardId);
  if (!parsed.success) {
    throw new Error('Invalid gift card');
  }

  await assertNotRateLimited();

  const cart = await CartService.removeGiftCardCode(parsed.data);
  return { data: cart, message: 'Gift card removed' };
}

export async function updateCartNoteAction(note: string): Promise<CartActionResult> {
  const parsed = cartNoteSchema.safeParse(note);
  if (!parsed.success) {
    throw new Error('Invalid order note');
  }

  await assertNotRateLimited();

  const cart = await CartService.updateNote(parsed.data);
  return { data: cart, message: 'Order note saved' };
}

export async function updateCartAttributesAction(
  attributes: Array<{ key: string; value: string }>,
): Promise<CartActionResult> {
  const parsed = cartAttributesSchema.safeParse(attributes);
  if (!parsed.success) {
    throw new Error('Invalid cart attributes');
  }

  await assertNotRateLimited();

  const cart = await CartService.updateAttributes(parsed.data);
  return { data: cart, message: 'Cart updated successfully' };
}

const reorderSchema = z.object({
  orderId: z.string().trim().regex(/^\d+$/, 'Invalid order').max(20),
});

/**
 * Re-add every currently purchasable line of a past order to the cart.
 * Requires the customer session (orders are customer-scoped), so guests are
 * asked to sign in. Variants that no longer exist or are not for sale are
 * skipped and reported in the returned message.
 */
export async function reorderAction(orderId: string): Promise<CartActionResult> {
  const parsed = reorderSchema.safeParse({ orderId });
  if (!parsed.success) {
    throw new Error('Invalid order');
  }

  await assertNotRateLimited();

  const token = await getShopifyToken();
  if (!token) {
    throw new Error('Please sign in to reorder');
  }

  const order = await getOrderById(token, parsed.data.orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  const lines: CartLineInput[] = [];
  let skipped = 0;

  for (const edge of order.lineItems.edges) {
    const variantId = edge.node.variant?.id;

    if (!variantId || edge.node.quantity < 1) {
      skipped += 1;
      continue;
    }

    if (edge.node.variant?.availableForSale === false) {
      skipped += 1;
      continue;
    }

    lines.push({
      merchandiseId: variantId,
      quantity: Math.min(edge.node.quantity, MAX_QUANTITY),
    });

    if (lines.length >= MAX_LINES_PER_REQUEST) break;
  }

  if (lines.length === 0) {
    throw new Error('None of the items in this order are available anymore');
  }

  const cart = await CartService.addLines(lines);

  return {
    data: cart,
    message:
      skipped > 0
        ? `${lines.length} items added back to your cart (${skipped} unavailable skipped)`
        : `${lines.length} items added back to your cart`,
  };
}
