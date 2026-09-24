import 'server-only';

import { reportError } from '@/lib/logger';
import { getShopifyToken, setShopifyToken } from '@/lib/server/shopify-helpers';
import { adminSdk, storefrontSdk } from '@/shopify';
import { CustomerEmailMarketingState, CustomerMarketingOptInLevel } from '@/shopify/admin';
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

  /**
   * Subscribe an email to the newsletter via the Admin API (single opt-in).
   *
   * The Storefront `customerCreate` requires a password, so passwordless
   * newsletter signup goes through Admin `customerCreate` with an email
   * marketing consent instead — no phantom credentials are minted.
   *
   * Enumeration-safe: an already-subscribed address resolves to success, so
   * the form never reveals whether an email belongs to a customer.
   */
  static async subscribeNewsletter(input: { email: string }) {
    let response;

    try {
      response = await adminSdk().NewsletterSubscribe({
        input: {
          email: input.email,
          emailMarketingConsent: {
            marketingOptInLevel: CustomerMarketingOptInLevel.SingleOptIn,
            marketingState: CustomerEmailMarketingState.Subscribed,
          },
        },
      });
    } catch (error) {
      reportError('UserService.subscribeNewsletter', error);
      return { error: 'Failed to subscribe' };
    }

    const { customer, userErrors } = response?.customerCreate || {};

    if (customer) {
      return { success: true };
    }

    // "Taken" means the email is already a customer: still a success, and the
    // only branch that must not leak which addresses are registered.
    const onlyTaken =
      (userErrors?.length ?? 0) > 0 &&
      (userErrors ?? []).every((userError) => /taken|already|exists/i.test(userError.message));

    if (onlyTaken) {
      return { success: true };
    }

    // Raw errors bubble to the action, which renders them via
    // `serviceErrorsToFormState` (it accepts any `{ userErrors }` shape).
    if (userErrors?.length) {
      return { userErrors };
    }

    return { error: 'Failed to subscribe' };
  }
}
