import 'server-only';

import { reportError } from '@/lib/logger';
import { setShopifyToken } from '@/lib/server/shopify-helpers';
import { CartService } from '@/services/cart.service';
import { storefrontSdk } from '@/shopify';
import { adjustPaginationVariables } from '@/shopify/helpers';
import type { CustomerAccessToken } from '@/shopify/storefront';
import { handleCustomerUserErrors, handleUserErrors } from '@/utils/form-actions';
import { getUser } from '@/utils/users';

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

type RecoverInput = {
  email: string;
};

type ResetPasswordInput = {
  password: string;
  resetToken: string;
};

/**
 * Authentication service
 * Handles all authentication-related business logic
 */
export class AuthService {
  /**
   * Register a new customer
   */
  static async register(input: RegisterInput) {
    const { email, password, firstName, lastName } = input;

    const registerResponse = await storefrontSdk('private').customerCreate({
      input: { email, firstName, lastName, password },
    });

    const { customerUserErrors, userErrors } = registerResponse?.customerCreate || {};

    const customerErrorResult = handleCustomerUserErrors(customerUserErrors);
    if (customerErrorResult) return customerErrorResult;

    const userErrorResult = handleUserErrors(userErrors);
    if (userErrorResult) return userErrorResult;

    // Auto-login after registration
    const loginResponse = await storefrontSdk('private').customerAccessTokenCreate({
      input: { email, password },
    });

    const { customerAccessToken, customerUserErrors: loginCustomerErrors } =
      loginResponse?.customerAccessTokenCreate || {};

    const loginErrorResult = handleCustomerUserErrors(loginCustomerErrors);
    if (loginErrorResult) return loginErrorResult;

    if (!customerAccessToken) {
      return { error: 'Failed to create account' };
    }

    await setShopifyToken(customerAccessToken);

    const user = await getUser();
    if (user) {
      await this.updateCartBuyerIdentity(customerAccessToken.accessToken, user);
    }

    return { success: true, customerAccessToken };
  }

  /**
   * Login a customer
   */
  static async login(input: LoginInput) {
    const { email, password } = input;

    const response = await storefrontSdk('private').customerAccessTokenCreate({
      input: { email, password },
    });

    const { customerUserErrors, customerAccessToken } = response?.customerAccessTokenCreate || {};

    const loginErrorResult = handleCustomerUserErrors(customerUserErrors);
    if (loginErrorResult) return loginErrorResult;

    if (!customerAccessToken) {
      return { error: 'Invalid email or password' };
    }

    await setShopifyToken(customerAccessToken);

    const user = await getUser();
    if (user) {
      await this.updateCartBuyerIdentity(customerAccessToken.accessToken, user);
    }

    return { success: true, customerAccessToken };
  }

  /**
   * Recover password (send reset email)
   */
  static async recoverPassword(input: RecoverInput) {
    const { email } = input;

    const response = await storefrontSdk('private').customerRecover({
      email,
    });

    const { customerUserErrors } = response?.customerRecover || {};

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    return { success: true };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(input: ResetPasswordInput) {
    const { password, resetToken } = input;

    const response = await storefrontSdk('private').customerResetByUrl({
      resetUrl: resetToken,
      password,
    });

    const { customerAccessToken, customerUserErrors } = response?.customerResetByUrl || {};

    const errorResult = handleCustomerUserErrors(customerUserErrors);
    if (errorResult) return errorResult;

    if (!customerAccessToken) {
      return { error: 'Failed to reset password' };
    }

    await setShopifyToken(customerAccessToken);

    return { success: true, customerAccessToken };
  }

  /**
   * Attach the current cart to the customer after login/register.
   * Runs server-side against the Shopify SDK so the request context (and thus
   * the cart cookie) is available; failures are logged but never block auth.
   */
  private static async updateCartBuyerIdentity(
    token: CustomerAccessToken['accessToken'],
    user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  ) {
    const cartId = await CartService.getCartId();

    if (!cartId) return;

    try {
      const response = await storefrontSdk('private').cartBuyerIdentityUpdate({
        buyerIdentity: {
          customerAccessToken: token,
          email: user.email,
          phone: user.phone,
        },
        cartId,
        ...adjustPaginationVariables({ first: 100 }),
      });

      const { userErrors } = response?.cartBuyerIdentityUpdate || {};

      if (userErrors && userErrors.length > 0) {
        reportError('AuthService.updateCartBuyerIdentity - user errors', userErrors);
      }
    } catch (error) {
      reportError('AuthService.updateCartBuyerIdentity', error);
    }
  }
}
