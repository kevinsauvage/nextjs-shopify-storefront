import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCustomerAddresses, getCustomerOrders } = vi.hoisted(() => ({
  getCustomerAddresses: vi.fn(),
  getCustomerOrders: vi.fn(),
}));

vi.mock('@/shopify', () => ({
  storefrontSdk: () => ({ getCustomerAddresses, getCustomerOrders }),
}));

import { getAccountStats, getOrderById } from './account';

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

describe('getOrderById', () => {
  const ORDER_GID = 'gid://shopify/Order/12345';

  beforeEach(() => {
    getCustomerOrders.mockReset();
  });

  it('returns the matching order from the customer order list', async () => {
    const order = { id: ORDER_GID, name: '#1001' };
    getCustomerOrders.mockResolvedValue({
      customer: { orders: { edges: [{ node: { id: 'gid://shopify/Order/1' } }, { node: order }] } },
    });

    await expect(getOrderById(CUSTOMER_TOKEN, '12345')).resolves.toEqual(order);
    expect(getCustomerOrders).toHaveBeenCalledWith(
      expect.objectContaining({ customerAccessToken: CUSTOMER_TOKEN, first: 100 }),
    );
  });

  it('matches suffixed Shopify ids against the bare global id', async () => {
    const order = { id: `${ORDER_GID}?model_name=Order`, name: '#1001' };
    getCustomerOrders.mockResolvedValue({
      customer: { orders: { edges: [{ node: order }] } },
    });

    await expect(getOrderById(CUSTOMER_TOKEN, '12345')).resolves.toEqual(order);
  });

  it('returns null when no order matches', async () => {
    getCustomerOrders.mockResolvedValue({
      customer: { orders: { edges: [{ node: { id: 'gid://shopify/Order/1' } }] } },
    });

    await expect(getOrderById(CUSTOMER_TOKEN, '12345')).resolves.toBeNull();
  });

  it('returns null for a non-numeric id without a Shopify round-trip', async () => {
    await expect(getOrderById(CUSTOMER_TOKEN, '../../evil')).resolves.toBeNull();
    expect(getCustomerOrders).not.toHaveBeenCalled();
  });

  it('returns null when the customer is gone', async () => {
    getCustomerOrders.mockResolvedValue({ customer: null });

    await expect(getOrderById(CUSTOMER_TOKEN, '12345')).resolves.toBeNull();
  });
});
