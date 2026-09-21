'use server';

import { UserService } from '@/services/user.service';
import type { FormState } from '@/types/formActions';
import { formSuccess, serviceErrorsToFormState, zodErrorsToFormState } from '@/utils/form-actions';

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
