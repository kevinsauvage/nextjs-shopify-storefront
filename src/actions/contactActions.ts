'use server';

import { headers } from 'next/headers';

import type { FormState } from '@/types/formActions';
import { safeLogError } from '@/utils/api-responses';
import { formError, formSuccess, zodErrorsToFormState } from '@/utils/form-actions';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Durable sliding-window limiter shared across serverless instances. Upstash is
// required (see `src/config/env.ts`), so there is no in-memory fallback.
const ratelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'contact',
  redis: Redis.fromEnv(),
});

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

const getClientIp = async (): Promise<string> => {
  const headerStore = await headers();

  return (
    headerStore.get('x-real-ip')?.trim() ||
    headerStore.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
};

const isRateLimited = async (key: string): Promise<boolean> => {
  const { success } = await ratelimit.limit(key);
  return !success;
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
  if (await isRateLimited(ip)) {
    return formError('Too many messages sent. Please try again later.');
  }

  const { EMAIL_ADDRESS, EMAIL_PASSWORD, NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_SITE_EMAIL, CONTACT_EMAIL } =
    process.env;
  const recipient = CONTACT_EMAIL || NEXT_PUBLIC_SITE_EMAIL || EMAIL_ADDRESS;

  if (!EMAIL_ADDRESS || !EMAIL_PASSWORD || !recipient) {
    safeLogError('contactAction', new Error('Contact email is not configured'));
    return formError('The contact form is temporarily unavailable. Please try again later.');
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

    return formSuccess('Email sent successfully');
  } catch (error) {
    safeLogError('contactAction', error);
    return formError('An error occurred while sending the email');
  }
};
