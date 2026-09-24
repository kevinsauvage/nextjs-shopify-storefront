import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getHeader } = vi.hoisted(() => ({ getHeader: vi.fn() }));

vi.mock('next/headers', () => ({ headers: async () => ({ get: getHeader }) }));

import { fingerprintForRateLimit, getClientIp, rateLimitKey, UNKNOWN_IP } from './client-ip';

describe('getClientIp', () => {
  beforeEach(() => {
    getHeader.mockReset();
    getHeader.mockReturnValue(null);
  });

  it('prefers x-vercel-forwarded-for and takes the first entry', async () => {
    getHeader.mockImplementation((name: unknown) =>
      name === 'x-vercel-forwarded-for' ? '2.2.2.2, 3.3.3.3' : null,
    );

    await expect(getClientIp()).resolves.toBe('2.2.2.2');
  });

  it('falls back to x-real-ip', async () => {
    getHeader.mockImplementation((name: unknown) => (name === 'x-real-ip' ? '4.4.4.4' : null));

    await expect(getClientIp()).resolves.toBe('4.4.4.4');
  });

  it('returns unknown when no trusted header is present', async () => {
    await expect(getClientIp()).resolves.toBe(UNKNOWN_IP);
  });

  it('ignores the spoofable x-forwarded-for header', async () => {
    getHeader.mockImplementation((name: unknown) =>
      name === 'x-forwarded-for' ? '9.9.9.9' : null,
    );

    await expect(getClientIp()).resolves.toBe(UNKNOWN_IP);
  });
});

describe('rateLimitKey', () => {
  it('returns the bare ip without a session part', () => {
    expect(rateLimitKey('1.2.3.4')).toBe('1.2.3.4');
  });

  it('appends the session part so unknown-IP traffic does not share one bucket', () => {
    expect(rateLimitKey('unknown', 'cart-1')).toBe('unknown:cart-1');
    expect(rateLimitKey('1.2.3.4', 'cart-1')).toBe('1.2.3.4:cart-1');
  });

  it('ignores blank session parts', () => {
    expect(rateLimitKey('1.2.3.4', '  ')).toBe('1.2.3.4');
    expect(rateLimitKey('1.2.3.4', null)).toBe('1.2.3.4');
  });
});

describe('fingerprintForRateLimit', () => {
  it('is deterministic, 16 hex chars, and never contains the secret', () => {
    const fingerprint = fingerprintForRateLimit('token-1');

    expect(fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprintForRateLimit('token-1')).toBe(fingerprint);
    expect(fingerprintForRateLimit('token-2')).not.toBe(fingerprint);
    expect(fingerprint).not.toContain('token-1');
  });
});
