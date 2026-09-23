import 'server-only';

import { setErrorReporter } from '@/lib/logger';

/**
 * Registers an optional error-reporting drain. When `ERROR_REPORTING_URL` is
 * set, errors are POSTed there as JSON without ever affecting the request.
 *
 * Swap this for `setErrorReporter` from Sentry (or another provider) when you
 * add one; the call site (`reportError`) stays the same.
 */
export const registerErrorReporter = (): void => {
  const url = process.env.ERROR_REPORTING_URL;

  if (!url) return;

  setErrorReporter(({ context, error, meta }) => {
    fetch(url, {
      body: JSON.stringify({
        context,
        message: error.message,
        stack: error.stack,
        meta,
        timestamp: new Date().toISOString(),
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }).catch(() => {
      // Never let reporting failures affect the application.
    });
  });
};
