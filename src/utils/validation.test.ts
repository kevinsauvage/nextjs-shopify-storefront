import {
  companyField,
  emailField,
  nameField,
  passwordField,
  phoneField,
  shopifyGidField,
} from './validation';

import { describe, expect, it } from 'vitest';

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
    'gid://shopify/MailingAddress/1',
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
