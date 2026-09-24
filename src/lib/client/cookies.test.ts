import { getCookieFront, setCookieFront } from './cookies';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }));

vi.mock('@/lib/logger', () => ({ reportError }));

type MutableGlobals = {
  document?: unknown;
};

const removeDocument = (): void => {
  delete (globalThis as unknown as MutableGlobals).document;
};

/** Installs a `document` whose cookie store is backed by `cookies`. */
const installDocument = (initial = ''): { written: string[] } => {
  let store = initial;
  const written: string[] = [];

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    enumerable: true,
    value: {
      get cookie(): string {
        return store;
      },
      set cookie(next: string) {
        written.push(next);
        store = next;
      },
    },
    writable: true,
  });

  return { written };
};

afterEach(() => {
  removeDocument();
  vi.unstubAllEnvs();
  reportError.mockClear();
});

describe('getCookieFront', () => {
  it('returns an empty string when document is unavailable', () => {
    removeDocument();

    expect(getCookieFront('session')).toBe('');
  });

  it('returns the value of the matching cookie', () => {
    installDocument('session=abc123; theme=dark');

    expect(getCookieFront('session')).toBe('abc123');
    expect(getCookieFront('theme')).toBe('dark');
  });

  it('trims whitespace around cookie pairs', () => {
    installDocument('  session=abc123  ;theme=dark ');

    expect(getCookieFront('theme')).toBe('dark');
  });

  it('does not match a longer cookie name sharing the prefix', () => {
    installDocument('session-token=abc123');

    expect(getCookieFront('session')).toBe('');
  });

  it('returns an empty string when the cookie is absent or the jar is empty', () => {
    installDocument('theme=dark');

    expect(getCookieFront('missing')).toBe('');

    installDocument('');

    expect(getCookieFront('missing')).toBe('');
  });
});

describe('setCookieFront', () => {
  it('throws a TypeError for invalid input parameters', () => {
    expect(() => setCookieFront(42 as unknown as string, 'value', 1)).toThrow(TypeError);
    expect(() => setCookieFront('name', 'value', 'soon' as unknown as number)).toThrow(TypeError);
  });

  it('writes the cookie with an expiry and Lax SameSite by default', () => {
    const { written } = installDocument();

    setCookieFront('session', 'abc123');

    expect(written).toHaveLength(1);
    expect(written[0]).toContain('session=abc123');
    expect(written[0]).toContain('expires=');
    expect(written[0]).toContain('path=/');
    expect(written[0]).toContain('SameSite=Lax');
    expect(written[0]).not.toContain('Secure');
  });

  it('adds the Secure flag in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { written } = installDocument();

    setCookieFront('session', 'abc123');

    expect(written[0]).toContain('; Secure');
  });

  it('honours explicit SameSite values and omits the attribute when undefined', () => {
    const { written } = installDocument();

    setCookieFront('a', '1', 1, 'Strict');

    expect(written[0]).toContain('SameSite=Strict');

    setCookieFront('b', '2', 1, 'None');

    expect(written[1]).toContain('SameSite=None');

    setCookieFront('c', '3', 1, null as unknown as 'Lax');

    expect(written[2]).not.toContain('SameSite');
  });

  it('does nothing when document is unavailable', () => {
    removeDocument();

    expect(() => setCookieFront('session', 'abc123')).not.toThrow();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports an error when assigning document.cookie throws', () => {
    const failure = new Error('cookie jar locked');
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      enumerable: true,
      value: {
        get cookie(): string {
          return '';
        },
        set cookie(_next: string) {
          throw failure;
        },
      },
      writable: true,
    });

    setCookieFront('session', 'abc123');

    expect(reportError).toHaveBeenCalledWith('cookies/set', failure);
  });
});
