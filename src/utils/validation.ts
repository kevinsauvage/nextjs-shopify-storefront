import { z } from 'zod';

/**
 * Shared bounded primitives for Server Action inputs.
 *
 * Every mutation input should be built from these (or add an equally bounded
 * inline schema with a comment): unbounded strings flow to Shopify
 * Admin/Storefront mutations and transactional email, where they amplify
 * cost, bloat logs, and leak downstream validation errors. Validating shape
 * locally also rejects junk IDs without burning a Storefront round-trip.
 */
export const emailField = z.string().trim().toLowerCase().email().max(254);

export const nameField = z.string().trim().min(1).max(100);

export const companyField = z.string().trim().max(100).optional();

export const phoneField = z.string().trim().max(30).optional();

/**
 * min-6 is kept deliberately: existing customers may hold 6–7 character
 * passwords, so login/register must keep accepting them. Secrets minted by
 * the reset flow are new, so `resetSchema` requires min-8 instead.
 */
export const passwordField = z.string().min(6).max(128);

/**
 * Loose Shopify global-id shape (`gid://shopify/<Type>/<id>`). Shape-level
 * only: a well-formed but wrong-type ID still fails at Shopify, but plain
 * junk never leaves the server.
 */
export const shopifyGidField = z
  .string()
  .min(1)
  .max(255)
  .regex(/^gid:\/\/shopify\/[A-Za-z]+\/\S+$/, 'Invalid ID');

/**
 * Strip the `?...` suffix Shopify appends to customer-scoped IDs
 * (`gid://shopify/MailingAddress/<id>?model_name=CustomerAddress&customer_access_token=…`).
 *
 * For display/comparison only — never for Shopify calls: customer address
 * mutations resolve the address from the FULL suffixed ID and answer
 * `RESOURCE_NOT_FOUND` for the bare GID.
 */
export const normalizeShopifyGid = (id: string | null | undefined): string =>
  id?.split('?')[0] ?? '';

/**
 * Customer address IDs as Shopify returns them, suffix included. Same shape
 * as `shopifyGidField` (`\S+` already covers `?`, `=` and `&`) but with room
 * for the embedded `customer_access_token` (~350 chars in practice): the
 * 255 bound would reject every real address ID before any Shopify call.
 */
export const shopifyCustomerAddressIdField = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^gid:\/\/shopify\/[A-Za-z]+\/\S+$/, 'Invalid ID');
