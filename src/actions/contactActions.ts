'use server';

import { headers } from 'next/headers';

import type { FormActionResult } from '@/types/formActions';
import { safeLogError } from '@/utils/api-responses';
import { zodErrorsToFormActionResult } from '@/utils/form-actions';

import nodemailer from 'nodemailer';
import { z } from 'zod';

const RATE_LIMIT = {
  max: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
} as const;

// Best-effort in-memory rate limit. On serverless this is per-instance, but it
// still removes the trivial "one request per email" spam vector.
const attempts = new Map<string, number[]>();

const contactSchema = z.object({
  email: z.string().email(),
  message: z
    .string()
    .min(3, {
      message: 'Message must be at least 3 characters long',
    })
    .max(255, {
      message: 'Message must be at most 255 characters long',
    }),
  name: z
    .string()
    .min(3, {
      message: 'Name must be at least 3 characters long',
    })
    .max(255, {
      message: 'Name must be at most 255 characters long',
    }),
  // Honeypot: real visitors never fill this field.
  website: z.string().nullish(),
});

type ContactInput = z.infer<typeof contactSchema>;

type ContactFieldErrors = {
  email?: string | string[];
  name?: string | string[];
  message?: string | string[];
};

const getClientIp = async (): Promise<string> => {
  const headerStore = await headers();
  return headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
};

const isRateLimited = (key: string): boolean => {
  if (attempts.size > 10_000) {
    attempts.clear();
  }

  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < RATE_LIMIT.windowMs);

  if (recent.length >= RATE_LIMIT.max) {
    attempts.set(key, recent);
    return true;
  }

  recent.push(now);
  attempts.set(key, recent);
  return false;
};

export const contactAction = async (
  input: ContactInput,
): Promise<FormActionResult<ContactFieldErrors> & ContactFieldErrors> => {
  const formData = contactSchema.safeParse(input);
  if (!formData.success) {
    const fieldErrors = formData.error.formErrors.fieldErrors as ContactFieldErrors;
    return { ...zodErrorsToFormActionResult(formData.error), ...fieldErrors };
  }

  const { name, email, message, website } = formData.data;

  // Silently accept honeypot submissions so bots do not learn they were caught.
  if (website) {
    return { success: 'Email sent successfully' };
  }

  const ip = await getClientIp();
  if (isRateLimited(ip)) {
    return { error: 'Too many messages sent. Please try again later.' };
  }

  const { EMAIL_ADDRESS, EMAIL_PASSWORD, NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_SITE_EMAIL, CONTACT_EMAIL } =
    process.env;
  const recipient = CONTACT_EMAIL || NEXT_PUBLIC_SITE_EMAIL || EMAIL_ADDRESS;

  if (!EMAIL_ADDRESS || !EMAIL_PASSWORD || !recipient) {
    safeLogError('contactAction', new Error('Contact email is not configured'));
    return { error: 'The contact form is temporarily unavailable. Please try again later.' };
  }

  const transporter = nodemailer.createTransport({
    auth: { pass: EMAIL_PASSWORD, user: EMAIL_ADDRESS },
    service: 'gmail',
  });

  try {
    await transporter.sendMail({
      from: { address: EMAIL_ADDRESS, name: NEXT_PUBLIC_SITE_NAME || 'Website' },
      replyTo: { address: email, name },
      subject: `New contact message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      to: recipient,
    });

    return { success: 'Email sent successfully' };
  } catch (error) {
    safeLogError('contactAction', error);
    return { error: 'An error occurred while sending the email' };
  }
};
