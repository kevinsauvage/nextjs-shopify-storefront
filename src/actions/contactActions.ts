'use server';

import { reportError } from '@/lib/logger';
import { getClientIp } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import type { FormState } from '@/types/formActions';
import { formError, formSuccess, zodErrorsToFormState } from '@/utils/form-actions';

import nodemailer from 'nodemailer';
import { z } from 'zod';

const CONTACT_RATE_LIMIT = { key: 'contact', tokens: 5, window: '10 m' } as const;

// Email headers (subject, reply-to display name) are built from these fields:
// carriage returns / line feeds would let a sender inject extra headers
// (`Bcc:`, ...), so they are rejected at validation AND stripped when sending.
const hasLineBreak = (value: string): boolean => /[\r\n]/.test(value);

const singleLine = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim();

const contactSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .refine((value) => !hasLineBreak(value), {
      message: 'Invalid email address',
    }),
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
    .trim()
    .min(3, {
      message: 'Name must be at least 3 characters long',
    })
    .max(255, {
      message: 'Name must be at most 255 characters long',
    })
    .refine((value) => !hasLineBreak(value), {
      message: 'Name must not contain line breaks',
    }),
  // Honeypot: real visitors never fill this field.
  website: z.string().nullish(),
});

type ContactInput = z.infer<typeof contactSchema>;

type ContactMailConfig = {
  from: string;
  pass: string;
  recipient: string;
  siteName: string;
};

/**
 * Contact delivery settings. The fields are validated for shape by
 * `src/config/env.ts`; presence is checked here so the form degrades to a
 * friendly error instead of throwing when mail is unconfigured.
 */
const getContactMailConfig = (): ContactMailConfig | null => {
  const {
    CONTACT_EMAIL,
    EMAIL_ADDRESS,
    EMAIL_PASSWORD,
    NEXT_PUBLIC_SITE_EMAIL,
    NEXT_PUBLIC_SITE_NAME,
  } = process.env;
  const recipient = CONTACT_EMAIL || NEXT_PUBLIC_SITE_EMAIL || EMAIL_ADDRESS;

  if (!EMAIL_ADDRESS || !EMAIL_PASSWORD || !recipient) return null;

  return {
    from: EMAIL_ADDRESS,
    pass: EMAIL_PASSWORD,
    recipient,
    siteName: NEXT_PUBLIC_SITE_NAME || 'Website',
  };
};

/**
 * Process-wide Gmail transporter, created once per credential set instead of
 * on every request. Keyed by credentials so a rotation (or a test env change)
 * transparently rebuilds it.
 */
let cachedTransportKey: string | null = null;
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

const getTransporter = (from: string, pass: string) => {
  const key = `${from}\n${pass}`;
  if (!cachedTransporter || cachedTransportKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      auth: { pass, user: from },
      service: 'gmail',
    });
    cachedTransportKey = key;
  }
  return cachedTransporter;
};

export const contactAction = async (input: ContactInput): Promise<FormState> => {
  const formData = contactSchema.safeParse(input);
  if (!formData.success) {
    return zodErrorsToFormState(formData.error);
  }

  const { name, email, message, website } = formData.data;

  // Silently accept honeypot submissions so bots do not learn they were caught.
  if (website) {
    return formSuccess('Email sent successfully');
  }

  const ip = await getClientIp();
  // Fail closed: this endpoint sends mail from the site's identity, so an
  // Upstash outage must deny sends rather than allow unlimited spam relay.
  if (
    await isRateLimited(
      CONTACT_RATE_LIMIT.key,
      ip,
      CONTACT_RATE_LIMIT.tokens,
      CONTACT_RATE_LIMIT.window,
      { failClosed: true },
    )
  ) {
    return formError('Too many messages sent. Please try again later.');
  }

  const mailConfig = getContactMailConfig();

  if (!mailConfig) {
    reportError('contactAction', new Error('Contact email is not configured'));
    return formError('The contact form is temporarily unavailable. Please try again later.');
  }

  const transporter = getTransporter(mailConfig.from, mailConfig.pass);

  try {
    // Belt and braces: validation already rejects line breaks, but the values
    // below become mail headers, so strip them again at construction.
    const safeName = singleLine(name);
    await transporter.sendMail({
      from: { address: mailConfig.from, name: mailConfig.siteName },
      replyTo: { address: email, name: safeName },
      subject: `New contact message from ${safeName}`,
      text: `From: ${safeName} <${email}>\n\n${message}`,
      to: mailConfig.recipient,
    });

    return formSuccess('Email sent successfully');
  } catch (error) {
    reportError('contactAction', error);
    return formError('An error occurred while sending the email');
  }
};
