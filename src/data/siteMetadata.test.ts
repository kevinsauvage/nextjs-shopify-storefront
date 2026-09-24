import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
});

const load = async () => {
  vi.resetModules();
  return (await import('./siteMetadata')).default;
};

describe('siteMetadata companyName', () => {
  it('prefers NEXT_PUBLIC_SITE_NAME when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_NAME', 'Acme');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://shop.example.com');

    const metadata = await load();

    expect(metadata.companyName).toBe('Acme');
  });

  it('derives the company name from the base URL host', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://shop.example.com/store');

    const metadata = await load();

    expect(metadata.companyName).toBe('shop.example.com');
  });

  it('falls back to Example without any env', async () => {
    const metadata = await load();

    expect(metadata.companyName).toBe('Example');
  });

  it('exposes defaults for the remaining fields', async () => {
    const metadata = await load();

    expect(metadata.siteUrl).toBe('https://example.com');
    expect(metadata.email).toBe('yourName@example.com');
    expect(metadata.twitterHandle).toBe('@example');
  });
});
