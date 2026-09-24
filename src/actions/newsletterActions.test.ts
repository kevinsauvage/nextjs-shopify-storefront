import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rateLimited, subscribe } = vi.hoisted(() => ({
  rateLimited: vi.fn(async () => false),
  subscribe: vi.fn(),
}));

vi.mock('@/lib/server/client-ip', () => ({ getClientIp: async () => '1.2.3.4' }));
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/services/user.service', () => ({
  UserService: { subscribeNewsletter: subscribe },
}));

import { subscribeNewsletterAction } from './newsletterActions';

const EMAIL = 'reader@example.com';

describe('subscribeNewsletterAction', () => {
  beforeEach(() => {
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    subscribe.mockReset();
  });

  it('subscribes a valid email and returns the success message', async () => {
    subscribe.mockResolvedValue({ success: true });

    const state = await subscribeNewsletterAction({ email: EMAIL });

    expect(subscribe).toHaveBeenCalledWith({ email: EMAIL });
    expect(state).toMatchObject({ message: 'Thanks — you are on the list.', ok: true });
  });

  it('rejects an invalid email without calling the service', async () => {
    const state = await subscribeNewsletterAction({ email: 'not-an-email' });

    expect(state.ok).toBe(false);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('returns the service error without leaking enrollment state', async () => {
    subscribe.mockResolvedValue({ userErrors: [{ message: 'Email is invalid' }] });

    const state = await subscribeNewsletterAction({ email: EMAIL });

    expect(state).toMatchObject({ message: 'Email is invalid', ok: false });
  });

  it('fails closed with a generic message when the limiter trips', async () => {
    rateLimited.mockResolvedValue(true);

    const state = await subscribeNewsletterAction({ email: EMAIL });

    expect(state).toMatchObject({
      message: 'Too many attempts. Please try again in a few minutes.',
      ok: false,
    });
    expect(subscribe).not.toHaveBeenCalled();
  });
});
