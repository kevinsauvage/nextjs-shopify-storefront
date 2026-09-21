import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { DEFAULTS } from './config/constants';
import { getStandardCookieOptions } from './utils/cookie-security';
import globalConfig from './config';

async function proxy(request: NextRequest) {
  const { nextUrl, cookies, headers, url } = request;
  const { searchParams, pathname } = nextUrl;

  const response = NextResponse.next();

  const userIp = headers.get('x-forwarded-for')?.split(',')[0] || DEFAULTS.ip;

  const cookieOptions = getStandardCookieOptions({ httpOnly: false });
  response.cookies.set(globalConfig.cookies.userIp, userIp, cookieOptions);
  response.cookies.set(globalConfig.cookies.url, url, cookieOptions);
  response.cookies.set(globalConfig.cookies.searchParams, searchParams.toString(), cookieOptions);

  const cookieShopify = cookies.get(globalConfig.cookies.shopifyToken);

  if (!cookieShopify && pathname.startsWith(globalConfig.routes.account)) {
    return NextResponse.redirect(new URL(globalConfig.routes.login, url));
  }

  if (
    cookieShopify &&
    (pathname.startsWith(globalConfig.routes.login) ||
      pathname.startsWith(globalConfig.routes.register))
  ) {
    return NextResponse.redirect(new URL(globalConfig.routes.account, url));
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
