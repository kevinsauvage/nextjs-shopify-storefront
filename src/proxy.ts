import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isTokenExpired, renewCustomerToken, shouldRenewToken } from './lib/token-renewal';
import { getCookieDeleteOptions, getSecureCookieOptions } from './utils/cookie-security';
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

  // Validate/renew the token only where the result changes behaviour:
  //  - account routes, once the token is inside its renewal window; and
  //  - auth routes, to bounce signed-in visitors and to catch revoked tokens.
  // Anonymous catalog requests never pay for this round-trip.
  const shouldValidate = hasToken && (isAuthRoute || shouldRenewToken(tokenExpiresAt));

  const renewedToken = shouldValidate
    ? await renewCustomerToken(cookieShopify?.value as string)
    : null;

  const validationFailed = shouldValidate && !renewedToken;
  // A rejected token is unusable when it has already expired, or when we only
  // learned it was rejected because an auth decision required checking it.
  const hasStaleSession = hasToken && validationFailed && (tokenExpired || isAuthRoute);
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
