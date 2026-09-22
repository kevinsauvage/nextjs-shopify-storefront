import { headers } from 'next/headers';

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
