/**
 * Shared logging + error-reporting helper usable from both server and client
 * code. Emits structured JSON on error/warn (these survive the production
 * `removeConsole` config) and forwards errors to an optional reporter.
 *
 * Register a reporter (e.g. Sentry) with `setErrorReporter`; the server wires
 * up an optional webhook drain in `src/lib/server/error-reporter.ts`.
 */

type LogLevel = 'warn' | 'error';

export type ErrorReport = {
  context: string;
  error: Error;
  meta?: Record<string, unknown>;
};

type ErrorReporter = (report: ErrorReport) => void;

let errorReporter: ErrorReporter | undefined;

export const setErrorReporter = (reporter: ErrorReporter | undefined): void => {
  errorReporter = reporter;
};

const REDACTIONS: Array<[RegExp, string]> = [
  [/[a-zA-Z0-9]{32,}/g, '[REDACTED]'],
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]'],
  [/password[=:]\s*[^\s]+/gi, 'password=[REDACTED]'],
  [/(api[_-]?key|access[_-]?token|secret)[=:]\s*[^\s]+/gi, '$1=[REDACTED]'],
];

export const sanitizeErrorMessage = (message: string): string =>
  REDACTIONS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    message,
  );

const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error('Unknown error');
  }
};

const write = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
  const entry = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  });

  if (level === 'error') {
    console.error(entry);
  } else {
    console.warn(entry);
  }
};

export const logWarn = (message: string, meta?: Record<string, unknown>): void => {
  write('warn', sanitizeErrorMessage(message), meta);
};

export const reportError = (
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void => {
  const normalized = toError(error);
  const message = sanitizeErrorMessage(normalized.message);

  write('error', context, { ...meta, error: message });

  if (process.env.NODE_ENV === 'development' && normalized.stack) {
    console.error(`[${context}] Stack:`, normalized.stack);
  }

  errorReporter?.({ context, error: normalized, meta });
};
