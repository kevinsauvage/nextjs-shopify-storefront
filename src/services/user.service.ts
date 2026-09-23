import 'server-only';

import { getShopifyToken, setShopifyToken } from '@/lib/server/shopify-helpers';
import { storefrontSdk } from '@/shopify';
import { handleCustomerUserErrors } from '@/utils/form-actions';

type UpdateUserInput = {
  email: string;
  firstName: string;
  lastName: string;
  acceptsMarketing?: string;
  company?: string;
  phone?: string;
};

/**
 * User service
 * Handles all user-related business logic
 */
export class UserService {
  /**
   * Update user information
   */
  static async updateUser(input: UpdateUserInput) {
    const shopifyToken = await getShopifyToken();

    if (!shopifyToken) {
      return { error: 'User not logged in' };
    }

    const { email, firstName, lastName, acceptsMarketing, company, phone } = input;

    const customerInput = {
      acceptsMarketing: acceptsMarketing === 'true',
      company,
      email,
      firstName,
      lastName,
      phone: phone || undefined,
    };

    const updateResponse = await storefrontSdk('private').customerUpdate({
      customer: customerInput,
      customerAccessToken: shopifyToken,
    });

    const { customerUserErrors, customer, customerAccessToken } =
      updateResponse?.customerUpdate || {};

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    if (customerAccessToken) {
      await setShopifyToken(customerAccessToken);
    }

    if (customer) {
      return { success: 'User updated successfully', customer };
    }

    return { error: 'Failed to update user' };
  }
}
