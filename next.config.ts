import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Pin Turbopack's root to this project so a stray lockfile in a parent
  // directory (e.g. ~/pnpm-lock.yaml) cannot be mistaken for the workspace root.
  turbopack: {
    root: import.meta.dirname,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    // `unsafe-eval` is only needed by the dev toolchain (HMR / React Refresh).
    //
    // `unsafe-inline` is an accepted, documented trade-off. A nonce/hash-based
    // `script-src` needs a unique nonce per response that is baked into the
    // HTML, which is impossible for the statically pre-rendered catalog (ISR).
    // Next.js's hydration bootstrap and the GTM snippet are inline, so removing
    // `unsafe-inline` would either break the app or force every page dynamic.
    // The other directives stay strict (`object-src 'none'`, `base-uri 'self'`,
    // `form-action 'self'`, `frame-ancestors 'self'`, explicit
    // `connect-src`/`img-src`), and store-provided HTML injected with
    // `dangerouslySetInnerHTML` is sanitized via `@/utils/sanitize`.
    const scriptSource = [
      "'self'",
      "'unsafe-inline'",
      ...(isProduction ? [] : ["'unsafe-eval'"]),
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://vercel.live',
    ].join(' ');

    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin',
      },
      {
        key: 'Permissions-Policy',
        value: [
          'camera=()',
          'microphone=()',
          'geolocation=()',
          'interest-cohort=()',
          'payment=()',
          'usb=()',
        ].join(', '),
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          `script-src ${scriptSource}`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https://cdn.shopify.com https://res.cloudinary.com https://www.googletagmanager.com https://www.google-analytics.com",
          "font-src 'self' data: https://fonts.gstatic.com https://cdn.shopify.com",
          "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.myshopify.com https://*.shopifycdn.com https://vercel.live",
          "frame-src 'self' https://www.googletagmanager.com https://vercel.live",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
          // Only upgrade insecure requests in production (where HTTPS is available)
          ...(isProduction ? ['upgrade-insecure-requests'] : []),
        ].join('; '),
      },
      {
        key: 'X-XSS-Protection',
        value: '0',
      },
    ];

    // Only add HSTS header in production (where HTTPS is available)
    if (isProduction) {
      securityHeaders.splice(2, 0, {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return Promise.resolve([
      {
        headers: securityHeaders,
        source: '/(.*)',
      },
    ]);
  },
  images: {
    qualities: [70, 75, 78, 80, 82, 85, 90],
    remotePatterns: [
      {
        hostname: 'res.cloudinary.com',
        protocol: 'https',
      },
      {
        hostname: 'cdn.shopify.com',
        protocol: 'https',
      },
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;
