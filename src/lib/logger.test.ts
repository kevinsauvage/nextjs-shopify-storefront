import { reportError, sanitizeErrorMessage, setErrorReporter } from './logger';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    setErrorReporter(undefined);
    vi.unstubAllEnvs();
  });

  it('redacts tokens and emails from messages', () => {
    const message = sanitizeErrorMessage(
      'failed for token=abcdefghijklmnopqrstuvwxyz0123456789 from user@example.com',
    );

    expect(message).toContain('[REDACTED]');
    expect(message).toContain('[EMAIL_REDACTED]');
  });

  it('redacts secret-shaped values but preserves ordinary long identifiers', () => {
    expect(
      sanitizeErrorMessage(
        'jwt eyJhbGciOiJIUzI1NiJ9.cGF5bG9hZA.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      ),
    ).toBe('jwt [REDACTED]');
    expect(sanitizeErrorMessage('auth Bearer abcDEF123-_')).toBe('auth Bearer [REDACTED]');
    expect(sanitizeErrorMessage('key shpat_abc123DEF456')).toBe('key [REDACTED]');
    expect(sanitizeErrorMessage('order 550e8400e29b41d4a716446655440000 shipped')).toBe(
      'order 550e8400e29b41d4a716446655440000 shipped',
    );
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

  it('serializes plain objects and degrades gracefully on circular values', () => {
    const reporter = vi.fn();
    setErrorReporter(reporter);

    reportError('unit-test', { code: 500 });

    expect(reporter.mock.calls[0]?.[0]).toMatchObject({
      error: expect.objectContaining({ message: expect.stringContaining('500') }),
    });

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    reportError('unit-test', circular);

    expect(reporter.mock.calls[1]?.[0]).toMatchObject({
      error: expect.objectContaining({ message: 'Unknown error' }),
    });

    setErrorReporter(undefined);
  });

  it('redacts sensitive meta keys and sanitizes arrays and primitives', () => {
    const reporter = vi.fn();
    setErrorReporter(reporter);

    reportError('unit-test', new Error('boom'), {
      count: 42,
      empty: null,
      password: 'hunter2',
      tags: ['a', 'token=secret-value'],
      nested: { accessToken: 'abc', ok: 'fine' },
    });

    const meta = reporter.mock.calls[0]?.[0] as { meta?: Record<string, unknown> };
    expect(meta.meta).toMatchObject({
      count: 42,
      empty: null,
      nested: { ok: 'fine' },
      password: '[REDACTED]',
    });
    expect((meta.meta?.nested as Record<string, unknown>)?.accessToken).toBe('[REDACTED]');
    expect(meta.meta?.tags).toEqual(['a', expect.stringContaining('[REDACTED]')]);

    setErrorReporter(undefined);
  });

  it('reports without a registered reporter', () => {
    setErrorReporter(undefined);

    expect(() => reportError('unit-test', new Error('no-reporter'))).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it('handles errors without a stack trace', () => {
    const reporter = vi.fn();
    setErrorReporter(reporter);
    const stackless = new Error('no-stack');
    stackless.stack = undefined;

    reportError('unit-test', stackless);

    expect(reporter).toHaveBeenCalledTimes(1);

    setErrorReporter(undefined);
  });

  it('logs the sanitized stack in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const reporter = vi.fn();
    setErrorReporter(reporter);
    const errorSpy = vi.mocked(console.error);
    errorSpy.mockClear();

    reportError('unit-test', new Error('dev-boom'));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[unit-test] Stack:'),
      expect.any(String),
    );

    setErrorReporter(undefined);
  });
});
