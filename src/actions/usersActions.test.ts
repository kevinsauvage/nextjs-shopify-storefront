import type * as ClientIpModule from '@/lib/server/client-ip';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rateLimited, updateUser } = vi.hoisted(() => ({
  rateLimited: vi.fn(async () => false),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/server/client-ip', async (importOriginal) => {
  const actual = await importOriginal<typeof ClientIpModule>();

  return { ...actual, getClientIp: async () => '1.2.3.4' };
});
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/services/user.service', () => ({ UserService: { updateUser } }));

import { updateUserAction } from './usersActions';

const INPUT = { email: 'Visitor@Example.com', firstName: 'Jane', lastName: 'Doe' };

describe('updateUserAction', () => {
  beforeEach(() => {
    rateLimited.mockReset();
    rateLimited.mockResolvedValue(false);
    updateUser.mockReset();
    updateUser.mockResolvedValue({ success: true });
  });

  it('updates the user and scopes the limiter by normalized email', async () => {
    const state = await updateUserAction(INPUT);

    expect(state.ok).toBe(true);
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(rateLimited).toHaveBeenCalledWith(
      'user:update',
      '1.2.3.4:visitor@example.com',
      10,
      '10 m',
      { failClosed: true },
    );
  });

  it('rejects invalid input without touching the limiter or service', async () => {
    const state = await updateUserAction({ ...INPUT, email: 'not-an-email' });

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects oversized names without touching the limiter or service', async () => {
    const state = await updateUserAction({ ...INPUT, firstName: 'x'.repeat(101) });

    expect(state.ok).toBe(false);
    expect(rateLimited).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('returns an error when rate limited without calling the service', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const state = await updateUserAction(INPUT);

    expect(state.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('returns the service error when the update fails', async () => {
    updateUser.mockResolvedValue({ error: 'Failed to update user' });

    const state = await updateUserAction(INPUT);

    expect(state).toMatchObject({ message: 'Failed to update user', ok: false });
  });

  it.each(['true', 'false'] as const)(
    'forwards acceptsMarketing=%s to the service',
    async (value) => {
      const state = await updateUserAction({ ...INPUT, acceptsMarketing: value });

      expect(state.ok).toBe(true);
      expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ acceptsMarketing: value }));
    },
  );

  it('rejects a null marketing flag (unchecked checkbox submits nothing)', async () => {
    const state = await updateUserAction({ ...INPUT, acceptsMarketing: null as never });

    expect(state.ok).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
