import { getNumericOrderId, toOrderGid } from './order';

import { describe, expect, it } from 'vitest';

describe('toOrderGid', () => {
  it('builds a global id from a numeric order id', () => {
    expect(toOrderGid('12345')).toBe('gid://shopify/Order/12345');
  });

  it('trims surrounding whitespace', () => {
    expect(toOrderGid('  12345  ')).toBe('gid://shopify/Order/12345');
  });

  it.each(['', 'abc', '12a45', '12 45', 'gid://shopify/Order/12345', '../123', '12?x=1'])(
    'rejects non-numeric input (%s)',
    (input) => {
      expect(toOrderGid(input)).toBeNull();
    },
  );
});

describe('getNumericOrderId', () => {
  it('extracts the numeric id from an order global id', () => {
    expect(getNumericOrderId('gid://shopify/Order/12345')).toBe('12345');
  });

  it('strips the Shopify customer-context suffix before matching', () => {
    expect(getNumericOrderId('gid://shopify/Order/12345?model_name=Order')).toBe('12345');
  });

  it.each([null, undefined, '', 'gid://shopify/Product/1', 'gid://shopify/Order/abc'])(
    'returns null for non-order ids (%s)',
    (input) => {
      expect(getNumericOrderId(input)).toBeNull();
    },
  );
});
