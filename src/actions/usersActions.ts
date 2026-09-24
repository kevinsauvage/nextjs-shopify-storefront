'use server';

import { getClientIp, rateLimitKey } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { UserService } from '@/services/user.service';
import type { FormState } from '@/types/formActions';
import {
  formError,
  formSuccess,
  serviceErrorsToFormState,
  zodErrorsToFormState,
} from '@/utils/form-actions';

import { z } from 'zod';

const userSchema = z.object({
  acceptsMarketing: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
});

type UpdateUserInput = z.infer<typeof userSchema>;

export async function updateUserAction(input: UpdateUserInput): Promise<FormState> {
  const result = userSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const { email, firstName, lastName, acceptsMarketing, company, phone } = result.data;

  const ip = await getClientIp();
  // Fail closed: profile writes hit the Shopify API on every call, so an
  // Upstash outage must deny writes rather than allow unlimited mutations.
  // The normalized email keeps NAT-shared IPs from sharing one bucket.
  if (
    await isRateLimited('user:update', rateLimitKey(ip, email.trim().toLowerCase()), 10, '10 m', {
      failClosed: true,
    })
  ) {
    return formError('Too many attempts. Please try again in a few minutes.');
  }

  const serviceResult = await UserService.updateUser({
    acceptsMarketing,
    company,
    email,
    firstName,
    lastName,
    phone,
  });

  const errorState = serviceErrorsToFormState(serviceResult, 'Failed to update user');
  if (errorState) return errorState;

  return formSuccess('User updated successfully');
}
