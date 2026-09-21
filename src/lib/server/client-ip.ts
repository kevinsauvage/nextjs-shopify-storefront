import { headers } from 'next/headers';

/** Sentinel returned when no trustworthy client IP header is present. */
export const UNKNOWN_IP = 'unknown';

/**
 * Best-effort client IP.
 *
 * `x-forwarded-for` is client-spoofable, so platform-set headers
 * (`x-real-ip`, `x-vercel-forwarded-for`) are preferred and the first
 * `x-forwarded-for` hop is only a fallback. Callers that use this for security
 * decisions must treat {@link UNKNOWN_IP} as a shared bucket.
 */
export const getClientIp = async (): Promise<string> => {
  const headerStore = await headers();

  return (
    headerStore.get('x-real-ip')?.trim() ||
    headerStore.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    UNKNOWN_IP
  );
};
