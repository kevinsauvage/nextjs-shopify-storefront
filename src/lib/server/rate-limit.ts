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
 * Fails open: if the limiter backend (Upstash) is unavailable, the request is
 * allowed through rather than turning a limiter outage into an auth/checkout
 * outage. The failure is logged so it is still observable.
 */
export const isRateLimited = async (
  name: string,
  key: string,
  tokens: number,
  window: Duration,
): Promise<boolean> => {
  try {
    const { success } = await getLimiter(name, tokens, window).limit(key);
    return !success;
  } catch (error) {
    reportError('isRateLimited', error, { name });
    return false;
  }
};
