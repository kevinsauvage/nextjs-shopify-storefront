import { z } from 'zod';

/**
 * Runtime environment schema.
 *
 * Only variables the app genuinely needs are required here. Optional Shopify
 * Admin / contact-email variables are validated for shape when present, and
 * Admin credentials must be provided as a pair.
 */
const requiredUrl = z.string().url();
const optionalUrl = z.string().url().optional();
const optionalString = z.string().min(1).optional();
const optionalEmail = z.string().email().optional();

const envSchema = z
  .object({
    // Required
    NEXT_PUBLIC_BASE_URL: requiredUrl,
    NEXT_PUBLIC_SHOPIFY_STOREFRONT_URL: requiredUrl,
    SHOPIFY_STORE_FRONT_ACCESS_TOKEN: z.string().min(1),

    // Required: durable contact-form rate limiting (Upstash for Redis)
    UPSTASH_REDIS_REST_URL: requiredUrl,
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    // Optional: Shopify Admin (needed for wishlist metafields + delegate tokens)
    SHOPIFY_ADMIN_URL: optionalUrl,
    SHOPIFY_STORE_FRONT_ADMIN_TOKEN: optionalString,
    SHOPIFY_SCOPE: optionalString,

    // Optional: contact form email delivery
    EMAIL_ADDRESS: optionalEmail,
    EMAIL_PASSWORD: optionalString,
    CONTACT_EMAIL: optionalEmail,

    // Optional: site configuration
    NEXT_PUBLIC_SITE_DOMAIN: optionalString,
    NEXT_PUBLIC_GTM_ID: optionalString,

    // Optional: site metadata (SEO / Open Graph fallbacks in data/siteMetadata.ts)
    NEXT_PUBLIC_SITE_NAME: optionalString,
    NEXT_PUBLIC_SITE_EMAIL: optionalEmail,
    NEXT_PUBLIC_SITE_PHONE: optionalString,
    NEXT_PUBLIC_SITE_LOGO: optionalUrl,
    NEXT_PUBLIC_SITE_LOGO_SQUARE: optionalUrl,
    NEXT_PUBLIC_SITE_FACEBOOK: optionalUrl,
    NEXT_PUBLIC_SITE_INSTAGRAM: optionalUrl,
    NEXT_PUBLIC_SITE_TWITTER: optionalUrl,
    NEXT_PUBLIC_SITE_TWITTER_HANDLE: optionalString,
    NEXT_PUBLIC_SITE_LINKEDIN: optionalUrl,
    NEXT_PUBLIC_SITE_ABOUT_SHORT: optionalString,

    // Optional: error reporting drain
    ERROR_REPORTING_URL: optionalUrl,
  })
  .superRefine((environment, context) => {
    const hasAdminUrl = Boolean(environment.SHOPIFY_ADMIN_URL);
    const hasAdminToken = Boolean(environment.SHOPIFY_STORE_FRONT_ADMIN_TOKEN);

    if (hasAdminUrl !== hasAdminToken) {
      context.addIssue({
        code: 'custom',
        message:
          'SHOPIFY_ADMIN_URL and SHOPIFY_STORE_FRONT_ADMIN_TOKEN must be set together (or both omitted).',
        path: ['SHOPIFY_ADMIN_URL'],
      });
    }
  });

/**
 * Validates the environment once at boot. Throws with a readable list of
 * problems so misconfiguration fails fast instead of at request time.
 */
export const validateEnv = (environment: Record<string, string | undefined> = process.env): void => {
  const result = envSchema.safeParse(environment);

  if (result.success) return;

  const problems = result.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${problems}`);
};
