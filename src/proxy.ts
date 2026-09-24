import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isTokenExpired, renewCustomerToken, shouldRenewToken } from './lib/token-renewal';
import {
  getCookieDeleteOptions,
  getReadableCookieOptions,
  getSecureCookieOptions,
} from './utils/cookie-security';
import globalConfig from './config';

/**
 * Runs on every navigation. It only manages session state (token renewal and
 * auth redirects) and never sets cookies on anonymous catalog responses, so
 * statically rendered pages stay cacheable at the CDN.
 *
 * Cookie writes must also happen here (not while rendering server components),
 * which is why stale-token cleanup lives in this file.
 */
async function proxy(request: NextRequest) {
  const { nextUrl, cookies, url } = request;
  const { pathname } = nextUrl;

  const cookieShopify = cookies.get(globalConfig.cookies.shopifyToken);
  const tokenExpiresAt = cookies.get(globalConfig.cookies.shopifyTokenExpire)?.value;

  const isAccountRoute = pathname.startsWith(globalConfig.routes.account);
  const isAuthRoute =
    pathname.startsWith(globalConfig.routes.login) ||
    pathname.startsWith(globalConfig.routes.register);

  const hasToken = Boolean(cookieShopify?.value);
  const tokenExpired = isTokenExpired(tokenExpiresAt);

  // Validate/renew the token everywhere the result changes behaviour:
  //  - account routes, on every visit (a revoked token must not keep access
  //    just because its expiry cookie still looks fresh);
  //  - auth routes, to bounce signed-in visitors and to catch revoked tokens;
  //  - anywhere, once the token is inside its renewal window.
  // Anonymous catalog requests never pay for this round-trip.
  const shouldValidate =
    hasToken && (isAuthRoute || isAccountRoute || shouldRenewToken(tokenExpiresAt));

  const renewedToken = shouldValidate
    ? await renewCustomerToken(cookieShopify?.value as string)
    : null;

  const validationFailed = shouldValidate && !renewedToken;
  // A rejected token is unusable when it has already expired, or when an auth
  // decision required checking it (auth + account routes fail closed: a token
  // that cannot be renewed there is treated as stale so its cookies are
  // deleted and the visitor is bounced to login). Catalog requests stay
  // fail-open so a Shopify blip never breaks browsing.
  const hasStaleSession =
    hasToken && validationFailed && (tokenExpired || isAuthRoute || isAccountRoute);
  const hasSession = hasToken && !hasStaleSession;

  let response: NextResponse;

  if (isAccountRoute && !hasSession) {
    response = NextResponse.redirect(new URL(globalConfig.routes.login, url));
  } else if (isAuthRoute && hasSession) {
    response = NextResponse.redirect(new URL(globalConfig.routes.account, url));
  } else {
    response = NextResponse.next();
  }

  if (hasStaleSession) {
    const deleteOptions = getCookieDeleteOptions();
    response.cookies.delete({ name: globalConfig.cookies.shopifyToken, ...deleteOptions });
    response.cookies.delete({ name: globalConfig.cookies.shopifyTokenExpire, ...deleteOptions });
    response.cookies.delete({ name: globalConfig.cookies.sessionPresent, ...deleteOptions });
  }

  if (renewedToken) {
    const expiresAt = new Date(renewedToken.expiresAt);
    const tokenOptions = getSecureCookieOptions({ expires: expiresAt });

    response.cookies.set(globalConfig.cookies.shopifyToken, renewedToken.accessToken, tokenOptions);
    response.cookies.set(
      globalConfig.cookies.shopifyTokenExpire,
      expiresAt.toISOString(),
      tokenOptions,
    );
    response.cookies.set(
      globalConfig.cookies.sessionPresent,
      '1',
      getReadableCookieOptions({ expires: expiresAt }),
    );
  } else if (hasSession && !cookies.get(globalConfig.cookies.sessionPresent)) {
    // Repair sessions created before the marker existed so the client does not
    // resolve a signed-in visitor as signed out. Set once; no cookie on
    // anonymous catalog responses, which keeps static pages CDN-cacheable.
    response.cookies.set(
      globalConfig.cookies.sessionPresent,
      '1',
      getReadableCookieOptions({ maxAge: globalConfig.constants.cookieExpiryDays * 24 * 60 * 60 }),
    );
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
