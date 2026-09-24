import 'server-only';

import config from '@/config';
import { reportError } from '@/lib/logger';
import { adminSdk } from '@/shopify/admin-client';

const delegateAccessScope = process.env.SHOPIFY_SCOPE;
const expiresIn = config.constants.delegateTokenExpirySeconds;

type CachedToken = {
  value: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;
let inFlight: Promise<string | null> | null = null;
// Short negative cache: a persistent failure (e.g. bad SHOPIFY_SCOPE) must not
// hit the Admin API and spam the logs on every request.
let failedAt = 0;
const NEGATIVE_CACHE_MS = 60_000;

const isUsable = (token: CachedToken | null): token is CachedToken =>
  token !== null && token.expiresAt - 60_000 > Date.now();

const createDelegateAccessToken = async (): Promise<string | null> => {
  if (!delegateAccessScope) {
    reportError('getDelegateAccessToken', new Error('SHOPIFY_SCOPE is not set'));
    return null;
  }

  // Normalize: a stray space after a comma would otherwise be sent as
  // `" read_x"` and rejected by Shopify with an "is invalid" user error.
  const requestedScopes = Array.from(
    new Set(
      delegateAccessScope
        .split(',')
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0),
    ),
  );

  if (requestedScopes.length === 0) {
    reportError('getDelegateAccessToken', new Error('SHOPIFY_SCOPE is empty'));
    return null;
  }

  try {
    const response = await adminSdk().delegateAccessTokenCreate({
      input: {
        delegateAccessScope: requestedScopes,
        expiresIn,
      },
    });

    const { delegateAccessToken, userErrors } = response?.delegateAccessTokenCreate || {};

    if (userErrors && userErrors.length > 0) {
      failedAt = Date.now();
      reportError('getDelegateAccessToken - user errors', userErrors, {
        delegateAccessScope: requestedScopes,
      });
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
    failedAt = Date.now();
    reportError('getDelegateAccessToken', error);
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

  if (Date.now() - failedAt < NEGATIVE_CACHE_MS) {
    return null;
  }

  inFlight ??= createDelegateAccessToken().finally(() => {
    inFlight = null;
  });

  return inFlight;
};
