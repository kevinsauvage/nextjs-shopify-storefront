import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAddress, deleteAddress, rateLimited, redirect, setDefaultAddress, updateAddress } =
  vi.hoisted(() => ({
    createAddress: vi.fn(),
    deleteAddress: vi.fn(),
    rateLimited: vi.fn(async () => false),
    redirect: vi.fn(),
    setDefaultAddress: vi.fn(),
    updateAddress: vi.fn(),
  }));

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/server/client-ip', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/client-ip')>();

  return { ...actual, getClientIp: async () => '1.2.3.4' };
});
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken: async () => 'token-9' }));
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

describe('createAddressAction', () => {
  beforeEach(() => {
    createAddress.mockReset();
    createAddress.mockResolvedValue({ success: true });
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    redirect.mockReset();
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
});

describe('deleteAddressAction', () => {
  beforeEach(() => {
    deleteAddress.mockReset();
    deleteAddress.mockResolvedValue({ success: true });
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    redirect.mockReset();
  });

  it('is rate limited before reaching the service', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const state = await deleteAddressAction('gid://shopify/MailingAddress/1');

    expect(state.ok).toBe(false);
    expect(deleteAddress).not.toHaveBeenCalled();
    expect(rateLimited).toHaveBeenCalledWith('address:write', addressBucket, 30, '1 m', {
      failClosed: true,
    });
  });

  it('rejects a malformed address id without touching the limiter or service', async () => {
    const state = await deleteAddressAction('not-a-gid');

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(deleteAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('deletes the address and redirects on success', async () => {
    await deleteAddressAction('gid://shopify/MailingAddress/1');

    expect(deleteAddress).toHaveBeenCalledWith('gid://shopify/MailingAddress/1');
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('returns the service error without redirecting when deletion fails', async () => {
    deleteAddress.mockResolvedValue({ customerUserErrors: [{ message: 'Address not found' }] });

    const state = await deleteAddressAction('gid://shopify/MailingAddress/1');

    expect(state).toMatchObject({ message: 'Address not found', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns a generic error when the service throws', async () => {
    deleteAddress.mockRejectedValue(new Error('network down'));

    const state = await deleteAddressAction('gid://shopify/MailingAddress/1');

    expect(state).toMatchObject({ message: 'Failed to delete address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('setDefaultAddressAction', () => {
  const ADDRESS_ID = 'gid://shopify/MailingAddress/1';

  beforeEach(() => {
    setDefaultAddress.mockReset();
    setDefaultAddress.mockResolvedValue({ success: true });
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    redirect.mockReset();
  });

  it('sets the default address and redirects on success', async () => {
    await setDefaultAddressAction(ADDRESS_ID);

    expect(setDefaultAddress).toHaveBeenCalledWith(ADDRESS_ID);
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('rejects a malformed address id without touching the limiter or service', async () => {
    const state = await setDefaultAddressAction('not-a-gid');

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(setDefaultAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns a generic error when the service throws', async () => {
    setDefaultAddress.mockRejectedValue(new Error('network down'));

    const state = await setDefaultAddressAction(ADDRESS_ID);

    expect(state).toMatchObject({ message: 'Failed to set default address', ok: false });
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
  });

  it('updates the address and redirects on success', async () => {
    await updateAddressAction(INPUT);

    expect(updateAddress).toHaveBeenCalledWith(INPUT);
    expect(redirect).toHaveBeenCalledWith(config.routes.addresses);
  });

  it('rejects invalid input without touching the limiter or service', async () => {
    const state = await updateAddressAction({ ...INPUT, zip: '' });

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(updateAddress).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns a generic error when the service throws', async () => {
    updateAddress.mockRejectedValue(new Error('network down'));

    const state = await updateAddressAction(INPUT);

    expect(state).toMatchObject({ message: 'Failed to update address', ok: false });
    expect(redirect).not.toHaveBeenCalled();
  });
});
