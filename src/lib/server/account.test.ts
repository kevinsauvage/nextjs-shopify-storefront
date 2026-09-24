import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCustomerAddresses, getCustomerOrders } = vi.hoisted(() => ({
  getCustomerAddresses: vi.fn(),
  getCustomerOrders: vi.fn(),
}));

vi.mock('@/shopify', () => ({
  storefrontSdk: () => ({ getCustomerAddresses, getCustomerOrders }),
}));

import { getAccountStats } from './account';

const CUSTOMER_TOKEN = 'customer-token';

describe('getAccountStats', () => {
  beforeEach(() => {
    getCustomerAddresses.mockReset();
    getCustomerOrders.mockReset();
  });

  it('aggregates counts and recent orders from a single fetch per resource', async () => {
    const recentOrders = [{ node: { id: 'order-1' } }];
    getCustomerOrders.mockResolvedValue({
      customer: { orders: { edges: recentOrders, totalCount: 5 } },
    });
    getCustomerAddresses.mockResolvedValue({
      customer: { addresses: { edges: [{ node: { id: 'address-1' } }] } },
    });

    await expect(getAccountStats(CUSTOMER_TOKEN)).resolves.toEqual({
      addressesCount: 1,
      ordersCount: 5,
      recentOrders,
    });
    expect(getCustomerOrders).toHaveBeenCalledWith(
      expect.objectContaining({ customerAccessToken: CUSTOMER_TOKEN }),
    );
    expect(getCustomerAddresses).toHaveBeenCalledWith(
      expect.objectContaining({ customerAccessToken: CUSTOMER_TOKEN }),
    );
  });

  it('degrades to zeros and an empty list when the customer is gone', async () => {
    getCustomerOrders.mockResolvedValue({ customer: null });
    getCustomerAddresses.mockResolvedValue({ customer: null });

    await expect(getAccountStats('revoked-token')).resolves.toEqual({
      addressesCount: 0,
      ordersCount: 0,
      recentOrders: [],
    });
  });
});
