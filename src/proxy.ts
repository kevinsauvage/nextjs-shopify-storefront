import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { renewCustomerToken, shouldRenewToken } from './lib/token-renewal';
import { getSecureCookieOptions } from './utils/cookie-security';
import globalConfig from './config';

/**
 * Runs on every navigation. It only manages session state (token renewal and
 * auth redirects) and never sets cookies on anonymous catalog responses, so
 * statically rendered pages stay cacheable at the CDN.
 */
async function proxy(request: NextRequest) {
  const { nextUrl, cookies, url } = request;
  const { pathname } = nextUrl;

  const cookieShopify = cookies.get(globalConfig.cookies.shopifyToken);
  const tokenExpiresAt = cookies.get(globalConfig.cookies.shopifyTokenExpire)?.value;

  // Renew here rather than during render: `cookies().set()` is only allowed in
  // middleware, Server Actions and Route Handlers.
  const renewedToken =
    cookieShopify?.value && shouldRenewToken(tokenExpiresAt)
      ? await renewCustomerToken(cookieShopify.value)
      : null;

  let response: NextResponse;

  if (!cookieShopify && pathname.startsWith(globalConfig.routes.account)) {
    response = NextResponse.redirect(new URL(globalConfig.routes.login, url));
  } else if (
    cookieShopify &&
    (pathname.startsWith(globalConfig.routes.login) ||
      pathname.startsWith(globalConfig.routes.register))
  ) {
    response = NextResponse.redirect(new URL(globalConfig.routes.account, url));
  } else {
    response = NextResponse.next();
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
