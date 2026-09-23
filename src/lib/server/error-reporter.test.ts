import { reportError, setErrorReporter } from '@/lib/logger';

import { registerErrorReporter } from './error-reporter';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REPORTING_URL = 'https://reporting.example.com/errors';
const TEST_CONTEXT = 'test-context';

// Collected by the `after()` mock below. Declared before `vi.mock` (which is
// hoisted) so the factory closure never reads through the TDZ.
const afterTasks: Array<() => void> = [];

vi.mock('next/server', () => ({
  after: vi.fn((task: () => void) => {
    afterTasks.push(task);
  }),
}));

beforeEach(() => {
  afterTasks.length = 0;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));
  process.env.ERROR_REPORTING_URL = REPORTING_URL;
});

afterEach(() => {
  setErrorReporter(undefined);
  delete process.env.ERROR_REPORTING_URL;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('registerErrorReporter', () => {
  it('defers the reporting POST past the response via after()', async () => {
    const { after } = await import('next/server');

    registerErrorReporter();
    reportError(TEST_CONTEXT, new Error('boom'));

    // Scheduled, not sent inline.
    expect(after).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();

    // Flushed after the response.
    afterTasks.forEach((task) => task());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(REPORTING_URL);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toMatchObject({
      context: TEST_CONTEXT,
      message: 'boom',
    });
  });

  it('falls back to fire-and-forget outside a request scope', async () => {
    const { after } = await import('next/server');
    vi.mocked(after).mockImplementationOnce(() => {
      throw new Error('`after` was called outside a request scope.');
    });

    registerErrorReporter();
    reportError(TEST_CONTEXT, new Error('boom'));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('registers nothing without ERROR_REPORTING_URL', async () => {
    delete process.env.ERROR_REPORTING_URL;

    registerErrorReporter();
    // No reporter → reportError only writes to the console, never fetches.
    reportError(TEST_CONTEXT, new Error('boom'));

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
