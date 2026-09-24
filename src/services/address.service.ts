import 'server-only';

import { reportError } from '@/lib/logger';
import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { storefrontSdk } from '@/shopify';
import { handleCustomerUserErrors } from '@/utils/form-actions';

type AddressInput = {
  address1: string;
  address2?: string;
  city: string;
  company?: string;
  country: string;
  firstName: string;
  id?: string;
  lastName: string;
  phone?: string;
  province?: string;
  zip: string;
};

const UNAUTHENTICATED_ERROR = 'User not authenticated';
const DEFAULT_ERROR = 'Something went wrong';

/**
 * Run a customer-scoped Storefront mutation: check the session token,
 * report + map transport failures, and let the caller map user errors.
 */
const withCustomerToken = async <T>(
  context: string,
  failureMessage: string,
  run: (customerAccessToken: string) => Promise<T>,
): Promise<T | { error: string }> => {
  const customerAccessToken = await getShopifyToken();
  if (!customerAccessToken) {
    return { error: UNAUTHENTICATED_ERROR };
  }

  try {
    return await run(customerAccessToken);
  } catch (error) {
    reportError(context, error);
    return { error: failureMessage };
  }
};

/**
 * Address service
 * Handles all address-related business logic
 */
export class AddressService {
  /**
   * Create a new address
   */
  static async createAddress(input: AddressInput) {
    const response = await withCustomerToken(
      'AddressService.createAddress',
      'Failed to create address',
      (customerAccessToken) =>
        storefrontSdk('private').customerAddressCreate({
          address: input,
          customerAccessToken,
        }),
    );
    if ('error' in response) return response;

    const { customerUserErrors, customerAddress } = response?.customerAddressCreate || {};

    if (customerAddress) {
      return { success: true, customerAddress };
    }

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    return { error: DEFAULT_ERROR };
  }

  /**
   * Update an existing address
   */
  static async updateAddress(input: AddressInput) {
    const { id, ...address } = input;
    if (!id) {
      return { error: 'Address ID is required for update' };
    }

    const response = await withCustomerToken(
      'AddressService.updateAddress',
      'Failed to update address',
      (customerAccessToken) =>
        storefrontSdk('private').customerAddressUpdate({
          address,
          addressId: id,
          customerAccessToken,
        }),
    );
    if ('error' in response) return response;

    const { customerUserErrors, customerAddress } = response?.customerAddressUpdate || {};

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    if (customerAddress) {
      return { success: true, customerAddress };
    }

    return { error: DEFAULT_ERROR };
  }

  /**
   * Delete an address
   */
  static async deleteAddress(addressId: string) {
    const response = await withCustomerToken(
      'AddressService.deleteAddress',
      'Failed to delete address',
      (customerAccessToken) =>
        storefrontSdk('private').customerAddressDelete({
          addressId,
          customerAccessToken,
        }),
    );
    if ('error' in response) return response;

    const { customerUserErrors, deletedCustomerAddressId } = response?.customerAddressDelete || {};

    if (deletedCustomerAddressId) {
      return { success: true, deletedCustomerAddressId };
    }

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    return { error: DEFAULT_ERROR };
  }

  /**
   * Set default address
   */
  static async setDefaultAddress(addressId: string) {
    const response = await withCustomerToken(
      'AddressService.setDefaultAddress',
      'Failed to set default address',
      (customerAccessToken) =>
        storefrontSdk('private').customerDefaultAddressUpdate({
          addressId,
          customerAccessToken,
        }),
    );
    if ('error' in response) return response;

    const { customerUserErrors, customer } = response?.customerDefaultAddressUpdate || {};

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    if (customer) {
      return { success: true, customer };
    }

    return { error: DEFAULT_ERROR };
  }
}
