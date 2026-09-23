import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getShopifyToken, sdk } = vi.hoisted(() => ({
  getShopifyToken: vi.fn(),
  sdk: {
    customerAddressCreate: vi.fn(),
    customerAddressDelete: vi.fn(),
    customerAddressUpdate: vi.fn(),
    customerDefaultAddressUpdate: vi.fn(),
  },
}));

vi.mock('@/lib/server/shopify-helpers', () => ({ getShopifyToken }));
vi.mock('@/shopify', () => ({ storefrontSdk: () => sdk }));
vi.mock('@/utils/api-responses', () => ({ safeLogError: vi.fn() }));

import { AddressService } from './address.service';

const TOKEN = 'token';
const ADDRESS_ID = 'gid://shopify/MailingAddress/1';
const NETWORK_ERROR = 'network down';
const TRANSIENT_FAILURE_TITLE = 'returns a form error instead of throwing on a transient failure';

const input = {
  address1: '1 Main St',
  city: 'Town',
  country: 'US',
  firstName: 'Ada',
  lastName: 'Lovelace',
  zip: '12345',
};
const inputWithId = { ...input, id: ADDRESS_ID };

describe('AddressService', () => {
  beforeEach(() => {
    getShopifyToken.mockReset();
    getShopifyToken.mockResolvedValue(TOKEN);
    Object.values(sdk).forEach((mock) => mock.mockReset());
  });

  describe('createAddress', () => {
    it('returns the created address', async () => {
      const customerAddress = { id: ADDRESS_ID };
      sdk.customerAddressCreate.mockResolvedValue({
        customerAddressCreate: { customerAddress },
      });

      await expect(AddressService.createAddress(input)).resolves.toEqual({
        success: true,
        customerAddress,
      });
    });

    it(TRANSIENT_FAILURE_TITLE, async () => {
      sdk.customerAddressCreate.mockRejectedValue(new Error(NETWORK_ERROR));

      await expect(AddressService.createAddress(input)).resolves.toEqual({
        error: 'Failed to create address',
      });
    });

    it('returns unauthenticated when there is no token', async () => {
      getShopifyToken.mockResolvedValue(null);

      await expect(AddressService.createAddress(input)).resolves.toEqual({
        error: 'User not authenticated',
      });
    });

    it('bubbles up customer user errors', async () => {
      const customerUserErrors = [{ message: 'Invalid address' }];
      sdk.customerAddressCreate.mockResolvedValue({
        customerAddressCreate: { customerAddress: null, customerUserErrors },
      });

      await expect(AddressService.createAddress(input)).resolves.toEqual({ customerUserErrors });
    });
  });

  describe('updateAddress', () => {
    it('returns the updated address', async () => {
      const customerAddress = { id: ADDRESS_ID };
      sdk.customerAddressUpdate.mockResolvedValue({
        customerAddressUpdate: { customerAddress },
      });

      await expect(AddressService.updateAddress(inputWithId)).resolves.toEqual({
        success: true,
        customerAddress,
      });
    });

    it('requires an address id', async () => {
      await expect(AddressService.updateAddress(input)).resolves.toEqual({
        error: 'Address ID is required for update',
      });
    });

    it(TRANSIENT_FAILURE_TITLE, async () => {
      sdk.customerAddressUpdate.mockRejectedValue(new Error(NETWORK_ERROR));

      await expect(AddressService.updateAddress(inputWithId)).resolves.toEqual({
        error: 'Failed to update address',
      });
    });
  });

  describe('deleteAddress', () => {
    it('returns the deleted id', async () => {
      sdk.customerAddressDelete.mockResolvedValue({
        customerAddressDelete: { deletedCustomerAddressId: ADDRESS_ID },
      });

      await expect(AddressService.deleteAddress(ADDRESS_ID)).resolves.toEqual({
        success: true,
        deletedCustomerAddressId: ADDRESS_ID,
      });
    });

    it(TRANSIENT_FAILURE_TITLE, async () => {
      sdk.customerAddressDelete.mockRejectedValue(new Error(NETWORK_ERROR));

      await expect(AddressService.deleteAddress(ADDRESS_ID)).resolves.toEqual({
        error: 'Failed to delete address',
      });
    });
  });

  describe('setDefaultAddress', () => {
    it('returns the customer', async () => {
      const customer = { id: 'gid://shopify/Customer/1' };
      sdk.customerDefaultAddressUpdate.mockResolvedValue({
        customerDefaultAddressUpdate: { customer },
      });

      await expect(AddressService.setDefaultAddress(ADDRESS_ID)).resolves.toEqual({
        success: true,
        customer,
      });
    });

    it(TRANSIENT_FAILURE_TITLE, async () => {
      sdk.customerDefaultAddressUpdate.mockRejectedValue(new Error(NETWORK_ERROR));

      await expect(AddressService.setDefaultAddress(ADDRESS_ID)).resolves.toEqual({
        error: 'Failed to set default address',
      });
    });
  });
});
