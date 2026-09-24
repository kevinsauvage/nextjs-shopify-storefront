import 'server-only';

import { headers } from 'next/headers';

import { createHash } from 'node:crypto';

/** Sentinel returned when no trustworthy client IP header is present. */
export const UNKNOWN_IP = 'unknown';

/**
 * Best-effort client IP.
 *
 * Only headers the platform is guaranteed to overwrite are trusted:
 * `x-vercel-forwarded-for` and `x-real-ip`. The generic `x-forwarded-for` is
 * deliberately NOT used because it is client-spoofable, which would let an
 * attacker rotate the value to bypass every rate limiter. When no trusted
 * header is present, {@link UNKNOWN_IP} is returned so callers fall back to a
 * single shared bucket instead of a spoofable key.
 */
export const getClientIp = async (): Promise<string> => {
  const headerStore = await headers();

  return (
    headerStore.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-real-ip')?.trim() ||
    UNKNOWN_IP
  );
};

/**
 * Short non-reversible fingerprint for secrets (customer tokens) used as a
 * rate-limit key component. The raw secret must never become part of a bucket
 * key — keys are stored in Upstash, so they would leak the credential at rest.
 */
export const fingerprintForRateLimit = (secret: string): string =>
  createHash('sha256').update(secret).digest('hex').slice(0, 16);

/**
 * Compose a rate-limit bucket key from the client IP plus an optional
 * session-derived component (cart id, fingerprinted token, normalized email).
 *
 * Off-Vercel there is no trusted IP header, so every client reports
 * {@link UNKNOWN_IP}: without the second component all of that traffic would
 * share a single global mutation bucket (legitimate-user 429s on cart writes).
 * Callers with session material must always pass it; callers without (read
 * paths like predictive search) knowingly keep the shared bucket.
 */
export const rateLimitKey = (ip: string, sessionPart?: string | null): string => {
  const part = sessionPart?.trim();

  return part ? `${ip}:${part}` : ip;
};
