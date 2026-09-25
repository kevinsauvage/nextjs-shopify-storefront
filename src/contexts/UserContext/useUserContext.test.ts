import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import { UserContext } from './UserContext';
import useUserContext from './useUserContext';

import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/actions/wishlistActions', () => ({
  mergeWishlistAction: vi.fn(),
  moveWishlistToCartAction: vi.fn(),
  setWishlistMembershipAction: vi.fn(),
}));

const renderDefault = (): ReturnType<typeof useUserContext> => {
  let captured: ReturnType<typeof useUserContext> | undefined;
  const Probe = (): null => {
    // eslint-disable-next-line react-hooks/globals -- capture pattern for asserting hook output.
    captured = useUserContext();
    return null;
  };
  renderToString(createElement(Probe));
  if (!captured) throw new Error('useUserContext did not run');

  return captured;
};

describe('useUserContext', () => {
  it('returns the default context value without a provider', async () => {
    const value = renderDefault();

    expect(value.isLoggedIn).toBe(false);
    expect(value.pendingWishlistIds).toEqual([]);
    expect(value.wishlistIds).toEqual([]);
    expect(value.wishlistReady).toBe(false);
    expect(UserContext).toBeDefined();

    await expect(value.handleSetWishlist(false, 'product-1')).resolves.toBeUndefined();
    await expect(value.handleMoveToCart(['product-1'])).resolves.toBeNull();
  });
});
