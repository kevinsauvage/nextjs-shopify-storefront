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
import { companyField, emailField, nameField, phoneField } from '@/utils/validation';

import { z } from 'zod';

const userSchema = z.object({
  // Strict 'true'/'false' contract with the account form, which sends React
  // state (an unchecked checkbox submits nothing via FormData).
  acceptsMarketing: z.enum(['true', 'false']).optional(),
  company: companyField,
  email: emailField,
  firstName: nameField,
  lastName: nameField,
  phone: phoneField,
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

  // Deliberately no revalidatePath here. Invalidating the current route makes
  // Next.js re-render this page right after the mutation, and the follow-up
  // read can still return the pre-update customer — resetting the form the
  // customer just saved. This action is the only mutating action in the app
  // that needs to keep the user on the page, so it returns state and leaves
  // the component in charge (matching the redirect-based flows elsewhere).
  return formSuccess('User updated successfully');
}
