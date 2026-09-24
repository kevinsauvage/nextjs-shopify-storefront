import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransport, rateLimited, safeLogError, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  rateLimited: vi.fn(async () => false),
  safeLogError: vi.fn(),
  sendMail: vi.fn(async (_mail: unknown) => ({})),
}));

vi.mock('nodemailer', () => ({ default: { createTransport } }));
vi.mock('@/lib/server/client-ip', () => ({ getClientIp: async () => '1.2.3.4' }));
vi.mock('@/lib/server/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => rateLimited(...(args as [])),
}));
vi.mock('@/utils/api-responses', () => ({
  safeLogError: (...args: unknown[]) => safeLogError(...args),
}));

import { contactAction } from './contactActions';

const INPUT = { email: 'visitor@example.com', message: 'Hello, I need help', name: 'Jane Doe' };

describe('contactAction', () => {
  beforeEach(() => {
    createTransport.mockReset();
    rateLimited.mockReset();
    safeLogError.mockReset();
    sendMail.mockReset();
    sendMail.mockResolvedValue({});
    rateLimited.mockResolvedValue(false);
    createTransport.mockReturnValue({ sendMail });
    vi.stubEnv('EMAIL_ADDRESS', 'site@example.com');
    vi.stubEnv('EMAIL_PASSWORD', 'secret');
    vi.stubEnv('CONTACT_EMAIL', 'support@example.com');
  });

  it('sends the message with a single-line subject for valid input', async () => {
    const state = await contactAction(INPUT);

    expect(state.ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'New contact message from Jane Doe',
        to: 'support@example.com',
      }),
    );
    const sentMail = sendMail.mock.calls[0]?.[0] as { subject?: string } | undefined;
    expect(sentMail?.subject).not.toMatch(/[\r\n]/);
  });

  it('rejects a name containing CR/LF without sending mail', async () => {
    const state = await contactAction({ ...INPUT, name: 'Evil\r\nBcc: victim@example.com' });

    expect(state.ok).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('rejects an email containing line breaks without sending mail', async () => {
    const state = await contactAction({ ...INPUT, email: 'a@example.com\r\nBcc: x@y.z' });

    expect(state.ok).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('denies sends when the rate limiter is unavailable (fail closed)', async () => {
    rateLimited.mockResolvedValueOnce(true);

    const state = await contactAction(INPUT);

    expect(state.ok).toBe(false);
    expect(rateLimited).toHaveBeenCalledWith('contact', '1.2.3.4', 5, '10 m', {
      failClosed: true,
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('silently accepts honeypot submissions without sending mail', async () => {
    const state = await contactAction({ ...INPUT, website: 'http://spam.example' });

    expect(state.ok).toBe(true);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
