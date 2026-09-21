import { reportError, sanitizeErrorMessage, setErrorReporter } from './logger';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('redacts tokens and emails from messages', () => {
    const message = sanitizeErrorMessage(
      'failed for token=abcdefghijklmnopqrstuvwxyz0123456789 from user@example.com',
    );

    expect(message).toContain('[REDACTED]');
    expect(message).toContain('[EMAIL_REDACTED]');
  });

  it('forwards normalized errors to a registered reporter', () => {
    const reporter = vi.fn();
    setErrorReporter(reporter);

    reportError('unit-test', new Error('boom'), { operation: 'test' });

    expect(reporter).toHaveBeenCalledTimes(1);
    expect(reporter.mock.calls[0]?.[0]).toMatchObject({
      context: 'unit-test',
      meta: { operation: 'test' },
    });

    setErrorReporter(undefined);
  });

  it('normalizes non-Error values', () => {
    const reporter = vi.fn();
    setErrorReporter(reporter);

    reportError('unit-test', 'plain string');

    expect(reporter.mock.calls[0]?.[0]).toMatchObject({
      context: 'unit-test',
      error: expect.any(Error),
    });

    setErrorReporter(undefined);
  });
});
