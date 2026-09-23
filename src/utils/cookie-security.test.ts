import {
  getCookieDeleteOptions,
  getCookieDomain,
  getSecureCookieOptions,
  shouldUseSecureCookies,
} from './cookie-security';

import { afterEach, describe, expect, it, vi } from 'vitest';

const NODE_ENV = 'NODE_ENV';
const SITE_DOMAIN = 'NEXT_PUBLIC_SITE_DOMAIN';
const PRODUCTION_DOMAIN = 'shop.example.com';
const TEST = 'test';
const PRODUCTION = 'production';
const DEVELOPMENT = 'development';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getCookieDomain', () => {
  it('uses the configured registrable domain in production', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    vi.stubEnv(SITE_DOMAIN, PRODUCTION_DOMAIN);

    expect(getCookieDomain()).toBe(PRODUCTION_DOMAIN);
  });

  it('strips a leading dot from the configured domain', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    vi.stubEnv(SITE_DOMAIN, `.${PRODUCTION_DOMAIN}`);

    expect(getCookieDomain()).toBe(PRODUCTION_DOMAIN);
  });

  it('ignores a .vercel.app host so the session cookie is not rejected', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    vi.stubEnv(SITE_DOMAIN, 'my-app-abc.vercel.app');

    expect(getCookieDomain()).toBeUndefined();
  });

  it('ignores single-label and IP hosts', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    vi.stubEnv(SITE_DOMAIN, 'localhost');
    expect(getCookieDomain()).toBeUndefined();

    vi.stubEnv(SITE_DOMAIN, '127.0.0.1');
    expect(getCookieDomain()).toBeUndefined();
  });

  it('returns undefined when nothing is configured', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    vi.stubEnv(SITE_DOMAIN, '');

    expect(getCookieDomain()).toBeUndefined();
  });

  it('uses a host-only cookie in development (localhost is not a valid domain)', () => {
    vi.stubEnv(NODE_ENV, DEVELOPMENT);

    expect(getCookieDomain()).toBeUndefined();
  });
});

describe('getCookieDeleteOptions', () => {
  it('omits the domain when none is configured', () => {
    vi.stubEnv(NODE_ENV, TEST);
    vi.stubEnv(SITE_DOMAIN, '');

    expect(getCookieDeleteOptions()).toEqual({ path: '/' });
  });

  it('includes the configured domain so a Domain-scoped cookie is removed', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    vi.stubEnv(SITE_DOMAIN, PRODUCTION_DOMAIN);

    expect(getCookieDeleteOptions()).toEqual({ domain: PRODUCTION_DOMAIN, path: '/' });
  });

  it('omits the domain in development because localhost is not a valid domain', () => {
    vi.stubEnv(NODE_ENV, DEVELOPMENT);

    expect(getCookieDeleteOptions()).toEqual({ path: '/' });
  });
});

describe('getSecureCookieOptions', () => {
  it('marks cookies httpOnly, lax and secure in production', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    vi.stubEnv(SITE_DOMAIN, PRODUCTION_DOMAIN);

    expect(getSecureCookieOptions()).toEqual({
      domain: PRODUCTION_DOMAIN,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });

  it('passes through maxAge and expires when provided', () => {
    vi.stubEnv(NODE_ENV, TEST);
    vi.stubEnv(SITE_DOMAIN, '');
    const expires = new Date('2030-01-01T00:00:00.000Z');

    expect(getSecureCookieOptions({ expires, maxAge: 60, path: '/cart' })).toEqual({
      domain: undefined,
      expires,
      httpOnly: true,
      maxAge: 60,
      path: '/cart',
      sameSite: 'lax',
      secure: false,
    });
  });
});

describe('shouldUseSecureCookies', () => {
  it('is true only in production', () => {
    vi.stubEnv(NODE_ENV, PRODUCTION);
    expect(shouldUseSecureCookies()).toBe(true);

    vi.stubEnv(NODE_ENV, DEVELOPMENT);
    expect(shouldUseSecureCookies()).toBe(false);

    vi.stubEnv(NODE_ENV, TEST);
    expect(shouldUseSecureCookies()).toBe(false);
  });
});
