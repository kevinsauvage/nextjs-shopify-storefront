import config from '@/config';
import { adminSdk } from '@/shopify/admin-client';
import { safeLogError } from '@/utils/api-responses';

const delegateAccessScope = process.env.SHOPIFY_SCOPE;
const expiresIn = config.constants.delegateTokenExpirySeconds;

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;
let inFlight: Promise<string | null> | null = null;

const isUsable = (token: CachedToken | null): token is CachedToken =>
  token !== null && token.expiresAt - 60_000 > Date.now();

const createDelegateAccessToken = async (): Promise<string | null> => {
  if (!delegateAccessScope) {
    safeLogError('getDelegateAccessToken', new Error('SHOPIFY_SCOPE is not set'));
    return null;
  }

  try {
    const response = await adminSdk().delegateAccessTokenCreate({
      input: {
        delegateAccessScope: delegateAccessScope.split(','),
        expiresIn,
      },
    });

    const { delegateAccessToken, userErrors } = response?.delegateAccessTokenCreate || {};

    if (userErrors && userErrors.length > 0) {
      safeLogError('getDelegateAccessToken - user errors', userErrors);
    }

    if (!delegateAccessToken?.accessToken) {
      return null;
    }

    cachedToken = {
      expiresAt: Date.now() + expiresIn * 1000,
      value: delegateAccessToken.accessToken,
    };

    return cachedToken.value;
  } catch (error) {
    // Admin may be unconfigured; degrade gracefully instead of failing the request.
    safeLogError('getDelegateAccessToken', error);
    return null;
  }
};

/**
 * Returns a delegate access token, creating it lazily and caching it in memory
 * for its full lifetime. Never call Shopify Admin on the hot path per request.
 */
export const getDelegateAccessToken = async (): Promise<string | null> => {
  if (isUsable(cachedToken)) {
    return cachedToken.value;
  }

  inFlight ??= createDelegateAccessToken().finally(() => {
    inFlight = null;
  });

  return inFlight;
};
