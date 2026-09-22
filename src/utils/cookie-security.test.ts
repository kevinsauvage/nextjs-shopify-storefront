import {
  getCookieDeleteOptions,
  getSecureCookieOptions,
  getStandardCookieOptions,
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

  it('uses the localhost domain in development', () => {
    vi.stubEnv(NODE_ENV, DEVELOPMENT);

    expect(getCookieDeleteOptions()).toEqual({ domain: 'localhost', path: '/' });
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
      domain: '',
      expires,
      httpOnly: true,
      maxAge: 60,
      path: '/cart',
      sameSite: 'lax',
      secure: false,
    });
  });
});

describe('getStandardCookieOptions', () => {
  it('leaves httpOnly unset unless explicitly requested', () => {
    vi.stubEnv(NODE_ENV, TEST);
    vi.stubEnv(SITE_DOMAIN, '');

    expect(getStandardCookieOptions()).toEqual({
      domain: '',
      path: '/',
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
