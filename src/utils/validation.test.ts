import {
  companyField,
  emailField,
  nameField,
  normalizeShopifyGid,
  passwordField,
  phoneField,
  shopifyCustomerAddressIdField,
  shopifyGidField,
} from './validation';

import { describe, expect, it } from 'vitest';

const MAILING_ADDRESS_GID = 'gid://shopify/MailingAddress/1';

describe('emailField', () => {
  it('normalizes casing and surrounding whitespace', () => {
    expect(emailField.safeParse('  Visitor@Example.com  ').data).toBe('visitor@example.com');
  });

  it('rejects malformed and oversized emails', () => {
    expect(emailField.safeParse('not-an-email').success).toBe(false);
    expect(emailField.safeParse(`a@${'b'.repeat(250)}.com`).success).toBe(false);
  });
});

describe('nameField', () => {
  it('trims and bounds names', () => {
    expect(nameField.safeParse('  Jane  ').data).toBe('Jane');
    expect(nameField.safeParse('').success).toBe(false);
    expect(nameField.safeParse('x'.repeat(101)).success).toBe(false);
  });
});

describe('passwordField', () => {
  it('keeps the Shopify-compatible minimum and caps length against hash DoS', () => {
    expect(passwordField.safeParse('secret').success).toBe(true);
    expect(passwordField.safeParse('short').success).toBe(false);
    expect(passwordField.safeParse('p'.repeat(129)).success).toBe(false);
  });
});

describe('companyField / phoneField', () => {
  it('allows missing values but bounds present ones', () => {
    expect(companyField.safeParse(undefined).success).toBe(true);
    expect(phoneField.safeParse(undefined).success).toBe(true);
    expect(companyField.safeParse('x'.repeat(101)).success).toBe(false);
    expect(phoneField.safeParse('x'.repeat(31)).success).toBe(false);
  });
});

describe('shopifyGidField', () => {
  it.each([
    'gid://shopify/ProductVariant/123',
    'gid://shopify/CartLine/abc123',
    MAILING_ADDRESS_GID,
  ])('accepts a Shopify global id (%s)', (gid) => {
    expect(shopifyGidField.safeParse(gid).success).toBe(true);
  });

  it.each(['', 'line-1', '123', 'gid://variant/1', 'gid://shopify/', 'gid://other/Type/1'])(
    'rejects junk ids (%s) without a Shopify round-trip',
    (id) => {
      expect(shopifyGidField.safeParse(id).success).toBe(false);
    },
  );
});

describe('normalizeShopifyGid', () => {
  it('strips the token query Shopify appends to customer address ids', () => {
    const suffixed =
      'gid://shopify/MailingAddress/12562417058090?model_name=CustomerAddress&customer_access_token=secret-token';

    expect(normalizeShopifyGid(suffixed)).toBe('gid://shopify/MailingAddress/12562417058090');
  });

  it('leaves bare gids untouched and tolerates missing input', () => {
    expect(normalizeShopifyGid(MAILING_ADDRESS_GID)).toBe(MAILING_ADDRESS_GID);
    expect(normalizeShopifyGid(null)).toBe('');
    expect(normalizeShopifyGid(undefined)).toBe('');
  });

  it('produces an id that passes shopifyGidField validation', () => {
    const suffixed = `${MAILING_ADDRESS_GID}?model_name=CustomerAddress&customer_access_token=${'t'.repeat(300)}`;

    expect(shopifyGidField.safeParse(suffixed).success).toBe(false);
    expect(shopifyGidField.safeParse(normalizeShopifyGid(suffixed)).success).toBe(true);
  });
});

describe('shopifyCustomerAddressIdField', () => {
  it('accepts the token-suffixed ids Shopify returns for customer addresses', () => {
    const suffixed = `${MAILING_ADDRESS_GID}?model_name=CustomerAddress&customer_access_token=${'t'.repeat(300)}`;

    expect(suffixed.length).toBeGreaterThan(255);
    expect(shopifyCustomerAddressIdField.safeParse(suffixed).success).toBe(true);
    expect(shopifyCustomerAddressIdField.safeParse(MAILING_ADDRESS_GID).success).toBe(true);
  });

  it('still rejects junk without a Shopify round-trip', () => {
    expect(shopifyCustomerAddressIdField.safeParse('not-a-gid').success).toBe(false);
    expect(shopifyCustomerAddressIdField.safeParse('').success).toBe(false);
  });
});
