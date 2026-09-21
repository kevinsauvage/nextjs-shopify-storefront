/**
 * Next.js instrumentation hook. Runs once when the server starts so that
 * misconfigured environments fail fast with a clear message.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/config/env');
    validateEnv();
  }
}
