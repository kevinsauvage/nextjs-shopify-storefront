import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { DEFAULTS } from './config/constants';
import { renewCustomerToken, shouldRenewToken } from './lib/token-renewal';
import { getSecureCookieOptions, getStandardCookieOptions } from './utils/cookie-security';
import globalConfig from './config';

/**
 * Best-effort client IP used for the Shopify buyer-IP header (market/currency
 * localization). `x-forwarded-for` is client-spoofable, so prefer platform-set
 * headers (`x-real-ip`, `x-vercel-forwarded-for`) and only fall back to the
 * first `x-forwarded-for` hop. The deployment platform must provide a trusted
 * header; otherwise the value is best-effort and must not be trusted.
 */
const getClientIp = (headers: Headers): string => {
  const trusted =
    headers.get('x-real-ip')?.trim() ||
    headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();

  if (trusted) return trusted;

  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || DEFAULTS.ip;
};

async function proxy(request: NextRequest) {
  const { nextUrl, cookies, headers, url } = request;
  const { searchParams, pathname } = nextUrl;

  const userIp = getClientIp(headers);

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

  const cookieOptions = getStandardCookieOptions({ httpOnly: false });
  response.cookies.set(globalConfig.cookies.userIp, userIp, cookieOptions);
  response.cookies.set(globalConfig.cookies.url, url, cookieOptions);
  response.cookies.set(globalConfig.cookies.searchParams, searchParams.toString(), cookieOptions);

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
