/**
 * Shared logging + error-reporting helper usable from both server and client
 * code. Emits structured JSON on error (these survive the production
 * `removeConsole` config) and forwards errors to an optional reporter.
 *
 * Register a reporter (e.g. Sentry) with `setErrorReporter`; the server wires
 * up an optional webhook drain in `src/lib/server/error-reporter.ts`.
 */

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

const REDACTED = '[REDACTED]';

const REDACTIONS: Array<[RegExp, string]> = [
  // Secret-shaped values, anchored to their scheme/prefix so ordinary long
  // identifiers (order numbers, hashes quoted in prose) survive: JWTs, bearer
  // authorizations, Shopify Admin tokens (`shpat_…`) and Stripe-style keys.
  [/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, REDACTED],
  [/\bBearer\s+[a-zA-Z0-9\-._~+/=]+/gi, `Bearer ${REDACTED}`],
  [/\bshp[a-z]{2}_[a-zA-Z0-9]+/g, REDACTED],
  [/\bsk-(?:live|test)-[a-zA-Z0-9]+/g, REDACTED],
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]'],
  [/password[=:]\s*[^\s]+/gi, `password=${REDACTED}`],
  [/(api[_-]?key|access[_-]?token|secret|token)[=:]\s*[^\s]+/gi, '$1=[REDACTED]'],
];

export const sanitizeErrorMessage = (message: string): string =>
  REDACTIONS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    message,
  );

/** Keys whose values must never reach a log sink, even nested in `meta`. */
const SENSITIVE_KEY = /password|token|secret|reseturl|authorization/i;

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') return sanitizeErrorMessage(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : sanitizeValue(entry),
      ]),
    );
  }
  return value;
};

const sanitizeMeta = (meta?: Record<string, unknown>): Record<string, unknown> | undefined =>
  meta ? (sanitizeValue(meta) as Record<string, unknown>) : undefined;

const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error('Unknown error');
  }
};

const write = (message: string, meta?: Record<string, unknown>): void => {
  const entry = JSON.stringify({
    level: 'error',
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  });

  console.error(entry);
};

export const reportError = (
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void => {
  const normalized = toError(error);
  const message = sanitizeErrorMessage(normalized.message);
  const safeMeta = sanitizeMeta(meta);

  write(context, { ...safeMeta, error: message });

  if (process.env.NODE_ENV === 'development' && normalized.stack) {
    console.error(`[${context}] Stack:`, sanitizeErrorMessage(normalized.stack));
  }

  // Hand the reporter redacted copies only — never the raw error/meta, which
  // can contain credentials or access tokens from GraphQL variables.
  const reportedError = new Error(message);
  reportedError.stack = normalized.stack ? sanitizeErrorMessage(normalized.stack) : undefined;

  errorReporter?.({ context, error: reportedError, meta: safeMeta });
};
