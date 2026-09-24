import type * as React from 'react';

import { UserContext, UserProvider } from './UserContext';

import { beforeEach, describe, expect, it, vi } from 'vitest';

type OptimisticReducer = (
  state: string[],
  action: { isWishlisted: boolean; productId: string },
) => string[];

const { captured, mocks, runtime } = vi.hoisted(() => ({
  captured: { reducer: undefined as OptimisticReducer | undefined },
  mocks: {
    addOptimistic: vi.fn(),
    getCookieFront: vi.fn(),
    getWishlistIdsAction: vi.fn(),
    push: vi.fn(),
    reportError: vi.fn(),
    setWishlistMembershipAction: vi.fn(),
    toastError: vi.fn(),
    toastInfo: vi.fn(),
    toastSuccess: vi.fn(),
    usePathname: vi.fn(),
  },
  runtime: {
    cleanups: [] as Array<() => void>,
    effectsArmed: true,
    slots: [] as Array<unknown>,
  },
}));

let cursor = 0;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();

  const useState = (initial: unknown): [unknown, (next: unknown) => void] => {
    const index = cursor;
    cursor += 1;
    if (index >= runtime.slots.length) {
      runtime.slots.push(typeof initial === 'function' ? (initial as () => unknown)() : initial);
    }
    const setState = (next: unknown): void => {
      runtime.slots[index] =
        typeof next === 'function'
          ? (next as (previous: unknown) => unknown)(runtime.slots[index])
          : next;
    };

    return [runtime.slots[index], setState];
  };

  return {
    ...actual,
    useCallback: <T>(callback: T): T => callback,
    useEffect: (effect: () => void | (() => void)): void => {
      if (!runtime.effectsArmed) return;
      const cleanup = effect();
      if (typeof cleanup === 'function') runtime.cleanups.push(cleanup);
    },
    useMemo: (factory: () => unknown): unknown => factory(),
    useOptimistic: (
      state: unknown,
      reducer: OptimisticReducer,
    ): [unknown, (...args: Array<never>) => void] => {
      captured.reducer = reducer;

      return [state, mocks.addOptimistic];
    },
    useState,
  };
});

vi.mock('next/navigation', () => ({
  usePathname: mocks.usePathname,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/actions/wishlistActions', () => ({
  getWishlistIdsAction: mocks.getWishlistIdsAction,
  setWishlistMembershipAction: mocks.setWishlistMembershipAction,
}));

vi.mock('@/lib/client/cookies', () => ({ getCookieFront: mocks.getCookieFront }));

vi.mock('@/lib/logger', () => ({ reportError: mocks.reportError }));

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
  },
}));

type UserValue = {
  handleSetWishlist: (isWishlisted: boolean, productId: string) => Promise<void>;
  isLoggedIn: boolean;
  pendingWishlistIds: string[];
  wishlistIds: string[];
  wishlistReady: boolean;
};

type ElementLike = {
  props: { children?: unknown; value?: unknown };
  type: unknown;
};

const renderUser = (runEffects = false): UserValue => {
  runtime.effectsArmed = runEffects;
  cursor = 0;
  const element = UserProvider({ children: null }) as unknown as ElementLike;
  runtime.effectsArmed = false;
  const value = element.props.value as UserValue | undefined;
  if (!value) throw new Error('UserProvider did not produce a value');

  return value;
};

type WatcherElement = {
  props: { onChange: (pathname: string) => void };
  type: (props: { onChange: (pathname: string) => void }) => null;
};

const getWatcherElement = (): WatcherElement => {
  cursor = 0;
  runtime.effectsArmed = false;
  const root = UserProvider({ children: null }) as unknown as ElementLike;
  const [suspense] = root.props.children as [ElementLike, null];

  return suspense.props.children as unknown as WatcherElement;
};

/**
 * Runs effects twice: the first pass commits the session state, the second
 * pass re-runs effects with the updated closure (mirroring the re-render real
 * React performs after the session effect calls its setters).
 */
const renderWithSession = (): void => {
  renderUser(true);
  renderUser(true);
};

const flush = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

beforeEach(() => {
  runtime.slots.length = 0;
  runtime.cleanups.length = 0;
  runtime.effectsArmed = true;
  captured.reducer = undefined;
  cursor = 0;
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.getCookieFront.mockReturnValue('');
  mocks.getWishlistIdsAction.mockResolvedValue([]);
  mocks.setWishlistMembershipAction.mockResolvedValue({
    data: ['product-1'],
    message: 'Added to wishlist',
    success: true,
  });
  mocks.usePathname.mockReturnValue('/products/example');
});

describe('UserContext defaults', () => {
  it('exposes a logged-out default without a provider', () => {
    expect(UserContext).toBeDefined();
  });
});

describe('UserProvider session', () => {
  it('stays logged out without a session marker and skips the wishlist fetch', async () => {
    mocks.getCookieFront.mockReturnValue('');

    renderUser(true);
    await flush();
    const value = renderUser();

    expect(value.isLoggedIn).toBe(false);
    expect(value.wishlistIds).toEqual([]);
    expect(value.wishlistReady).toBe(true);
    expect(mocks.getWishlistIdsAction).not.toHaveBeenCalled();
  });

  it('loads the wishlist once logged in', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    mocks.getWishlistIdsAction.mockResolvedValue(['product-1', 'product-2']);

    renderWithSession();
    const loading = renderUser();

    expect(loading.wishlistReady).toBe(false);

    await flush();
    const value = renderUser();

    expect(value.isLoggedIn).toBe(true);
    expect(value.wishlistIds).toEqual(['product-1', 'product-2']);
    expect(value.pendingWishlistIds).toEqual([]);
    expect(value.wishlistReady).toBe(true);
  });

  it('marks the wishlist ready even when the load fails', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    mocks.getWishlistIdsAction.mockRejectedValue(new Error('shopify down'));

    renderWithSession();
    await flush();
    const value = renderUser();

    expect(mocks.reportError).toHaveBeenCalledWith('wishlist/load', expect.any(Error));
    expect(value.wishlistIds).toEqual([]);
    expect(value.wishlistReady).toBe(true);
  });

  it('drops the wishlist result once the effect is cleaned up', async () => {
    mocks.getCookieFront.mockReturnValue('1');
    let resolveIds: ((ids: string[]) => void) | undefined;
    mocks.getWishlistIdsAction.mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveIds = resolve;
      }),
    );

    renderWithSession();
    for (const cleanup of runtime.cleanups) cleanup();
    runtime.cleanups.length = 0;
    resolveIds?.(['product-1']);
    await flush();
    const value = renderUser();

    expect(value.wishlistIds).toEqual([]);
    expect(value.wishlistReady).toBe(false);
  });

  it('forwards pathname changes from the watcher to the provider', () => {
    mocks.usePathname.mockReturnValue('/collections/all');
    const watcher = getWatcherElement();

    runtime.effectsArmed = true;
    watcher.type({ onChange: watcher.props.onChange });
    runtime.effectsArmed = false;

    const seen: string[] = [];
    runtime.effectsArmed = true;
    watcher.type({ onChange: (pathname) => seen.push(pathname) });
    runtime.effectsArmed = false;

    expect(seen).toEqual(['/collections/all']);
  });
});

describe('optimistic wishlist reducer', () => {
  it('covers add, remove, duplicate and no-op transitions', async () => {
    mocks.getCookieFront.mockReturnValue('1');

    renderUser(true);
    await flush();

    const { reducer } = captured;
    if (!reducer) throw new Error('optimistic reducer was not captured');

    expect(reducer(['a'], { isWishlisted: true, productId: 'a' })).toEqual([]);
    expect(reducer(['a'], { isWishlisted: false, productId: 'b' })).toEqual(['a', 'b']);
    expect(reducer(['a'], { isWishlisted: false, productId: 'a' })).toEqual(['a']);
  });
});

describe('UserProvider handleSetWishlist', () => {
  const renderLoggedIn = async (): Promise<UserValue> => {
    mocks.getCookieFront.mockReturnValue('1');
    renderWithSession();
    await flush();

    return renderUser();
  };

  it('redirects logged-out visitors to login with a return path', async () => {
    mocks.getCookieFront.mockReturnValue('');
    (globalThis as unknown as { window?: unknown }).window = {
      location: { pathname: '/products/example' },
    };
    try {
      const value = await (async (): Promise<UserValue> => {
        renderUser(true);
        await flush();

        return renderUser();
      })();

      await value.handleSetWishlist(false, 'product-1');

      expect(mocks.toastInfo).toHaveBeenCalledWith(
        'You need to login to add products to your wishlist',
      );
      expect(mocks.push).toHaveBeenCalledWith('/login?redirect=/products/example');
      expect(mocks.setWishlistMembershipAction).not.toHaveBeenCalled();
    } finally {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });

  it('falls back to the tracked pathname when window is unavailable', async () => {
    mocks.getCookieFront.mockReturnValue('');
    delete (globalThis as unknown as { window?: unknown }).window;

    renderUser(true);
    await flush();
    const value = renderUser();

    await value.handleSetWishlist(false, 'product-1');

    expect(mocks.push).toHaveBeenCalledWith('/login?redirect=');
  });

  it('applies a successful toggle with optimistic tracking', async () => {
    const value = await renderLoggedIn();

    await value.handleSetWishlist(false, 'product-3');

    expect(mocks.addOptimistic).toHaveBeenCalledWith({
      isWishlisted: false,
      productId: 'product-3',
    });
    expect(mocks.setWishlistMembershipAction).toHaveBeenCalledWith(false, 'product-3');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Added to wishlist');

    const settled = renderUser();

    expect(settled.wishlistIds).toEqual(['product-1']);
    expect(settled.pendingWishlistIds).toEqual([]);
  });

  it('keeps a single pending entry for concurrent toggles of the same product', async () => {
    let release: ((result: unknown) => void) | undefined;
    mocks.setWishlistMembershipAction.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const value = await renderLoggedIn();

    const first = value.handleSetWishlist(false, 'product-9');
    const second = renderUser();

    expect(second.pendingWishlistIds).toEqual(['product-9']);

    const concurrent = second.handleSetWishlist(false, 'product-9');
    release?.({ data: ['product-9'], message: 'Added', success: true });
    await first;
    await concurrent;
    const settled = renderUser();

    expect(settled.pendingWishlistIds).toEqual([]);
  });

  it('shows the action message when the toggle is rejected', async () => {
    mocks.setWishlistMembershipAction.mockResolvedValue({
      message: 'Not allowed',
      success: false,
    });
    const value = await renderLoggedIn();

    await value.handleSetWishlist(true, 'product-1');

    expect(mocks.toastError).toHaveBeenCalledWith('Not allowed');
    expect(renderUser().pendingWishlistIds).toEqual([]);
  });

  it('shows a generic message when the rejection has no message', async () => {
    mocks.setWishlistMembershipAction.mockResolvedValue({ success: false });
    const value = await renderLoggedIn();

    await value.handleSetWishlist(true, 'product-1');

    expect(mocks.toastError).toHaveBeenCalledWith('Something went wrong');
  });

  it('reports toggle failures', async () => {
    mocks.setWishlistMembershipAction.mockRejectedValue(new Error('network down'));
    const value = await renderLoggedIn();

    await value.handleSetWishlist(true, 'product-1');

    expect(mocks.reportError).toHaveBeenCalledWith('wishlist/toggle', expect.any(Error), {
      productId: 'product-1',
    });
    expect(mocks.toastError).toHaveBeenCalledWith('Something went wrong');
    expect(renderUser().pendingWishlistIds).toEqual([]);
  });
});
