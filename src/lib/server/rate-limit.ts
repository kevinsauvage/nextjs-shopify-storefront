import { reportError } from '@/lib/logger';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type Duration = `${number} ${'s' | 'm' | 'h' | 'd'}`;

/**
 * Durable sliding-window rate limiters backed by Upstash (required by
 * `src/config/env.ts`), shared across serverless instances. Limiters are
 * memoized per configuration so each call site keeps a stable bucket prefix.
 */
const limiters = new Map<string, Ratelimit>();

const getLimiter = (name: string, tokens: number, window: Duration): Ratelimit => {
  const id = `${name}:${tokens}:${window}`;
  let limiter = limiters.get(id);

  if (!limiter) {
    limiter = new Ratelimit({
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: name,
      redis: Redis.fromEnv(),
    });
    limiters.set(id, limiter);
  }

  return limiter;
};

/**
 * Returns `true` when `key` has exceeded `tokens` requests per `window`.
 *
 * Fails open by default: if the limiter backend (Upstash) is unavailable, the
 * request is allowed through rather than turning a limiter outage into a
 * checkout/catalog outage. The failure is logged so it is still observable.
 *
 * Pass `{ failClosed: true }` for security-sensitive buckets (auth): when the
 * backend is down, deny the request instead of allowing unlimited attempts.
 */
export const isRateLimited = async (
  name: string,
  key: string,
  tokens: number,
  window: Duration,
  { failClosed = false }: { failClosed?: boolean } = {},
): Promise<boolean> => {
  try {
    const { success } = await getLimiter(name, tokens, window).limit(key);
    return !success;
  } catch (error) {
    reportError('isRateLimited', error, { name });
    return failClosed;
  }
};
