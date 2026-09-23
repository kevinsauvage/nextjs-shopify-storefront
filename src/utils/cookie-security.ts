import config from '@/config';

/**
 * Hosts that a `Domain=` cookie attribute cannot be used with. A domain cookie
 * must be a *parent* of the request host (browsers reject it otherwise), and
 * single-label hosts like `localhost` are not valid domains at all.
 */
const isUnusableCookieDomain = (domain: string): boolean => {
  const normalized = domain.toLowerCase();

  // Single-label hosts (`localhost`) and IP addresses have no parent domain.
  if (!normalized.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    return true;
  }

  // Vercel/Fly preview hostnames are not registrable parents of themselves, and
  // a `Domain=` cookie set on the deployment host is rejected by the browser —
  // which silently drops the whole session. Fall back to a host-only cookie.
  return (
    normalized.endsWith('.vercel.app') ||
    normalized.endsWith('.now.sh') ||
    normalized.endsWith('.fly.dev') ||
    normalized.endsWith('.netlify.app')
  );
};

/**
 * Cookie `Domain` attribute, or `undefined` for a host-only cookie.
 *
 * Host-only cookies are the safe default: they are always accepted, and they
 * still work on the custom apex/www domain once `NEXT_PUBLIC_SITE_DOMAIN` is
 * configured to a registrable parent (e.g. `example.com`).
 */
export function getCookieDomain(): string | undefined {
  const configured =
    process.env.NODE_ENV === 'development'
      ? config.constants.domains.localhost
      : process.env.NEXT_PUBLIC_SITE_DOMAIN;

  const domain = configured?.trim().replace(/^\./, '');

  if (!domain || isUnusableCookieDomain(domain)) return undefined;

  return domain;
}

export function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Options for deleting a cookie that was set with {@link getCookieDomain}.
 *
 * A cookie set with a `Domain` attribute is NOT removed by a host-only delete,
 * so callers must pass the same domain/path to `cookies().delete(...)` or the
 * cookie (e.g. the session token) survives logout.
 */
export function getCookieDeleteOptions(): { domain?: string; path: string } {
  const domain = getCookieDomain();
  return domain ? { domain, path: '/' } : { path: '/' };
}

export function getSecureCookieOptions(
  options: {
    maxAge?: number;
    expires?: Date;
    path?: string;
  } = {},
): {
  domain?: string;
  expires?: Date;
  httpOnly: boolean;
  maxAge?: number;
  path: string;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
} {
  return {
    domain: getCookieDomain(),
    httpOnly: true,
    path: options.path || '/',
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    ...(options.maxAge && { maxAge: options.maxAge }),
    ...(options.expires && { expires: options.expires }),
  };
}

/**
 * Options for a readable (non-httpOnly) presence marker.
 *
 * Markers carry no secret — only whether a cookie-backed cart/session exists —
 * so client providers can skip a server-action round-trip when there is nothing
 * to resolve. They use the same domain/path/secure flags as the cookie they
 * mirror so both expire together.
 */
export function getReadableCookieOptions(
  options: {
    maxAge?: number;
    expires?: Date;
    path?: string;
  } = {},
): {
  domain?: string;
  expires?: Date;
  httpOnly: boolean;
  maxAge?: number;
  path: string;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
} {
  return {
    domain: getCookieDomain(),
    httpOnly: false,
    path: options.path || '/',
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    ...(options.maxAge && { maxAge: options.maxAge }),
    ...(options.expires && { expires: options.expires }),
  };
}
