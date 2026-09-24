import { beforeEach, describe, expect, it, vi } from 'vitest';

const { limit, reportError } = vi.hoisted(() => ({
  limit: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: () => ({}) } }));
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = (...args: unknown[]) => args;

    limit = (...args: unknown[]) => limit(...(args as []));
  },
}));
vi.mock('@/lib/logger', () => ({
  reportError: (...args: unknown[]) => reportError(...(args as [])),
}));

import { isRateLimited } from './rate-limit';

describe('isRateLimited', () => {
  beforeEach(() => {
    limit.mockReset();
    reportError.mockReset();
  });

  it('allows requests under the limit', async () => {
    limit.mockResolvedValue({ success: true });

    await expect(isRateLimited('test', 'key-1', 10, '1 m')).resolves.toBe(false);
  });

  it('denies requests over the limit', async () => {
    limit.mockResolvedValue({ success: false });

    await expect(isRateLimited('test', 'key-1', 10, '1 m')).resolves.toBe(true);
  });

  it('fails open by default when Upstash is unavailable', async () => {
    limit.mockRejectedValue(new Error('Upstash down'));

    await expect(isRateLimited('test', 'key-1', 10, '1 m')).resolves.toBe(false);
    expect(reportError).toHaveBeenCalledWith('isRateLimited', expect.anything(), {
      name: 'test',
    });
  });

  it('fails closed when requested so mutations cannot bypass the limiter', async () => {
    limit.mockRejectedValue(new Error('Upstash down'));

    await expect(isRateLimited('test', 'key-1', 10, '1 m', { failClosed: true })).resolves.toBe(
      true,
    );
  });
});
