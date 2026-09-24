import type * as ClientIpModule from '@/lib/server/client-ip';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAddress,
  deleteAddress,
  getShopifyTokenValue,
  rateLimited,
  redirect,
  setDefaultAddress,
  updateAddress,
} = vi.hoisted(() => ({
  createAddress: vi.fn(),
  deleteAddress: vi.fn(),
  getShopifyTokenValue: { current: 'token-9' as string | null },
  rateLimited: vi.fn(async () => false),
  redirect: vi.fn(),
  setDefaultAddress: vi.fn(),
  updateAddress: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/server/client-ip', async (importOriginal) => {
  const actual = await importOriginal<typeof ClientIpModule>();

  return { ...actual, getClientIp: async () => '1.2.3.4' };
});
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/server/shopify-helpers', () => ({
  getShopifyToken: async () => getShopifyTokenValue.current,
}));
vi.mock('@/services/address.service', () => ({
  AddressService: { createAddress, deleteAddress, setDefaultAddress, updateAddress },
}));
vi.mock('@/lib/logger', () => ({ reportError: vi.fn() }));

import config from '@/config';

import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from './addressesActions';

const INPUT = {
  address1: '123 Main St',
  city: 'Paris',
  country: 'France',
  firstName: 'Jane',
  lastName: 'Doe',
  zip: '75001',
};

const addressBucket = expect.stringMatching(/^1\.2\.3\.4:[0-9a-f]{16}$/);

const ADDRESS_GID = 'gid://shopify/MailingAddress/1';
const SUFFIXED_ADDRESS_GID = `${ADDRESS_GID}?model_name=CustomerAddress&customer_access_token=${'t'.repeat(300)}`;
const NOT_A_GID = 'not-a-gid';
const NETWORK_DOWN_MESSAGE = 'network down';

describe('createAddressAction', () => {
  beforeEach(() => {
    createAddress.mockReset();
    createAddress.mockResolvedValue({ success: true });
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    redirect.mockReset();
    getShopifyTokenValue.current = 'token-9';
  });

  it('creates the address behind a session-scoped fail-closed limiter', async () => {
    await createAddressAction(INPUT);

    expect(createAddress).toHaveBeenCalledTimes(1);
    expect(rateLimited).toHaveBeenCalledWith('address:write', addressBucket, 30, '1 m', {
      failClosed: true,
    });
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('rejects invalid input without touching the limiter or service', async () => {
    const state = await createAddressAction({ ...INPUT, city: '' });

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(createAddress).not.toHaveBeenCalled();
  });

  it('rejects oversized input without touching the limiter or service', async () => {
    const state = await createAddressAction({ ...INPUT, address1: 'x'.repeat(256) });

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(createAddress).not.toHaveBeenCalled();
  });

  it('returns an error when rate limited without calling the service', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const state = await createAddressAction(INPUT);

    expect(state.ok).toBe(false);
    expect(createAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns the service error without redirecting when creation fails', async () => {
    createAddress.mockResolvedValue({ customerUserErrors: [{ message: 'Invalid address' }] });

    const state = await createAddressAction(INPUT);

    expect(state).toMatchObject({ message: 'Invalid address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns a generic error when creation throws', async () => {
    createAddress.mockRejectedValue(new Error(NETWORK_DOWN_MESSAGE));

    const state = await createAddressAction(INPUT);

    expect(state).toMatchObject({ message: 'Failed to create address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('scopes the limiter globally when there is no session token', async () => {
    getShopifyTokenValue.current = null;

    await createAddressAction(INPUT);

    expect(rateLimited).toHaveBeenCalledWith('address:write', '1.2.3.4', 30, '1 m', {
      failClosed: true,
    });
    expect(createAddress).toHaveBeenCalledTimes(1);
  });
});

describe('deleteAddressAction', () => {
  beforeEach(() => {
    deleteAddress.mockReset();
    deleteAddress.mockResolvedValue({ success: true });
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    redirect.mockReset();
    getShopifyTokenValue.current = 'token-9';
  });

  it('is rate limited before reaching the service', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const state = await deleteAddressAction(ADDRESS_GID);

    expect(state.ok).toBe(false);
    expect(deleteAddress).not.toHaveBeenCalled();
    expect(rateLimited).toHaveBeenCalledWith('address:write', addressBucket, 30, '1 m', {
      failClosed: true,
    });
  });

  it('rejects a malformed address id without touching the limiter or service', async () => {
    const state = await deleteAddressAction(NOT_A_GID);

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(deleteAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('deletes the address and redirects on success', async () => {
    await deleteAddressAction(ADDRESS_GID);

    expect(deleteAddress).toHaveBeenCalledWith(ADDRESS_GID);
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('accepts the token-suffixed ids Shopify returns and forwards them untouched', async () => {
    await deleteAddressAction(SUFFIXED_ADDRESS_GID);

    expect(deleteAddress).toHaveBeenCalledWith(SUFFIXED_ADDRESS_GID);
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('returns the service error without redirecting when deletion fails', async () => {
    deleteAddress.mockResolvedValue({ customerUserErrors: [{ message: 'Address not found' }] });

    const state = await deleteAddressAction(ADDRESS_GID);

    expect(state).toMatchObject({ message: 'Address not found', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns a generic error when deletion throws', async () => {
    deleteAddress.mockRejectedValue(new Error(NETWORK_DOWN_MESSAGE));

    const state = await deleteAddressAction(ADDRESS_GID);

    expect(state).toMatchObject({ message: 'Failed to delete address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('setDefaultAddressAction', () => {
  beforeEach(() => {
    setDefaultAddress.mockReset();
    setDefaultAddress.mockResolvedValue({ success: true });
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    redirect.mockReset();
    getShopifyTokenValue.current = 'token-9';
  });

  it('sets the default address and redirects on success', async () => {
    await setDefaultAddressAction(ADDRESS_GID);

    expect(setDefaultAddress).toHaveBeenCalledWith(ADDRESS_GID);
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('accepts the token-suffixed ids Shopify returns and forwards them untouched', async () => {
    await setDefaultAddressAction(SUFFIXED_ADDRESS_GID);

    expect(setDefaultAddress).toHaveBeenCalledWith(SUFFIXED_ADDRESS_GID);
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('rejects a malformed address id without touching the limiter or service', async () => {
    const state = await setDefaultAddressAction(NOT_A_GID);

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(setDefaultAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns a generic error when setting the default throws', async () => {
    setDefaultAddress.mockRejectedValue(new Error(NETWORK_DOWN_MESSAGE));

    const state = await setDefaultAddressAction(ADDRESS_GID);

    expect(state).toMatchObject({ message: 'Failed to set default address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns the service error without redirecting when setting the default fails', async () => {
    setDefaultAddress.mockResolvedValue({ customerUserErrors: [{ message: 'Not found' }] });

    const state = await setDefaultAddressAction(ADDRESS_GID);

    expect(state).toMatchObject({ message: 'Not found', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('is rate limited before reaching the service', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const state = await setDefaultAddressAction(ADDRESS_GID);

    expect(state.ok).toBe(false);
    expect(setDefaultAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('updateAddressAction', () => {
  beforeEach(() => {
    updateAddress.mockReset();
    updateAddress.mockResolvedValue({ success: true });
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    redirect.mockReset();
    getShopifyTokenValue.current = 'token-9';
  });

  it('updates the address and redirects on success', async () => {
    await updateAddressAction(INPUT);

    expect(updateAddress).toHaveBeenCalledWith(INPUT);
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('forwards the round-tripped address id untouched', async () => {
    await updateAddressAction({ ...INPUT, id: SUFFIXED_ADDRESS_GID });

    expect(updateAddress).toHaveBeenCalledWith({ ...INPUT, id: SUFFIXED_ADDRESS_GID });
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('rejects invalid input without touching the limiter or service', async () => {
    const state = await updateAddressAction({ ...INPUT, zip: '' });

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(updateAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns a generic error when the update throws', async () => {
    updateAddress.mockRejectedValue(new Error(NETWORK_DOWN_MESSAGE));

    const state = await updateAddressAction(INPUT);

    expect(state).toMatchObject({ message: 'Failed to update address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns the service error without redirecting when the update fails', async () => {
    updateAddress.mockResolvedValue({ customerUserErrors: [{ message: 'Invalid address' }] });

    const state = await updateAddressAction(INPUT);

    expect(state).toMatchObject({ message: 'Invalid address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns an error when rate limited without calling the service', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const state = await updateAddressAction(INPUT);

    expect(state.ok).toBe(false);
    expect(updateAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
