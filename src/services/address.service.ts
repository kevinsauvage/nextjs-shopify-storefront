import { getShopifyToken } from '@/lib/server/shopify-helpers';
import { storefrontSdk } from '@/shopify';
import { safeLogError } from '@/utils/api-responses';
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

/**
 * Address service
 * Handles all address-related business logic
 */
export class AddressService {
  private static readonly UNAUTHENTICATED_ERROR = 'User not authenticated';
  private static readonly DEFAULT_ERROR = 'Something went wrong';

  /**
   * Create a new address
   */
  static async createAddress(input: AddressInput) {
    const customerAccessToken = await getShopifyToken();
    if (!customerAccessToken) {
      return { error: this.UNAUTHENTICATED_ERROR };
    }

    const response = await storefrontSdk('private').customerAddressCreate({
      address: input,
      customerAccessToken,
    });

    const { customerUserErrors, customerAddress } = response?.customerAddressCreate || {};

    if (customerAddress) {
      return { success: true, customerAddress };
    }

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    return { error: this.DEFAULT_ERROR };
  }

  /**
   * Update an existing address
   */
  static async updateAddress(input: AddressInput) {
    const customerAccessToken = await getShopifyToken();
    if (!customerAccessToken) {
      return { error: this.UNAUTHENTICATED_ERROR };
    }

    const { id, ...address } = input;
    if (!id) {
      return { error: 'Address ID is required for update' };
    }

    const response = await storefrontSdk('private').customerAddressUpdate({
      address,
      addressId: id,
      customerAccessToken,
    });

    const { customerUserErrors, customerAddress } = response?.customerAddressUpdate || {};

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    if (customerAddress) {
      return { success: true, customerAddress };
    }

    return { error: this.DEFAULT_ERROR };
  }

  /**
   * Delete an address
   */
  static async deleteAddress(addressId: string) {
    const customerAccessToken = await getShopifyToken();
    if (!customerAccessToken) {
      return { error: this.UNAUTHENTICATED_ERROR };
    }

    const response = await storefrontSdk('private').customerAddressDelete({
      addressId,
      customerAccessToken,
    });

    const { customerUserErrors, deletedCustomerAddressId } = response?.customerAddressDelete || {};

    if (deletedCustomerAddressId) {
      return { success: true, deletedCustomerAddressId };
    }

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    return { error: this.DEFAULT_ERROR };
  }

  /**
   * Set default address
   */
  static async setDefaultAddress(addressId: string) {
    const customerAccessToken = await getShopifyToken();
    if (!customerAccessToken) {
      return { error: this.UNAUTHENTICATED_ERROR };
    }

    let response;
    try {
      response = await storefrontSdk('private').customerDefaultAddressUpdate({
        addressId,
        customerAccessToken,
      });
    } catch (error) {
      safeLogError('AddressService.setDefaultAddress', error);
      return { error: 'Failed to set default address' };
    }

    const { customerUserErrors, customer } = response?.customerDefaultAddressUpdate || {};

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    if (customer) {
      return { success: true, customer };
    }

    return { error: this.DEFAULT_ERROR };
  }
}
