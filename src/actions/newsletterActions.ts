'use server';

import { userFeedback } from '@/data/userFeedback';
import { getClientIp } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { UserService } from '@/services/user.service';
import type { FormState } from '@/types/formActions';
import { formSuccess, serviceErrorsToFormState, zodErrorsToFormState } from '@/utils/form-actions';
import { emailField } from '@/utils/validation';

import { z } from 'zod';

const subscribeSchema = z.object({
  email: emailField,
});

type SubscribeNewsletterInput = z.infer<typeof subscribeSchema>;

export const subscribeNewsletterAction = async (
  input: SubscribeNewsletterInput,
): Promise<FormState> => {
  const result = subscribeSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const { email } = result.data;

  const ip = await getClientIp();
  // Two buckets like password recovery: per-target stops list-bombing one
  // address, per-IP stops spraying across many addresses from one host.
  const [targetLimited, ipLimited] = await Promise.all([
    isRateLimited('newsletter:subscribe', `${ip}:${email}`, 3, '15 m', { failClosed: true }),
    isRateLimited('newsletter:subscribe:ip', ip, 10, '15 m', { failClosed: true }),
  ]);
  if (targetLimited || ipLimited) {
    return {
      message: 'Too many attempts. Please try again in a few minutes.',
      ok: false,
    };
  }

  const serviceResult = await UserService.subscribeNewsletter({ email });

  const errorState = serviceErrorsToFormState(serviceResult, userFeedback.newsletter.error);
  if (errorState) return errorState;

  return formSuccess(userFeedback.newsletter.success);
};
