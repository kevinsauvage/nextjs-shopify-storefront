'use server';

import { UserService } from '@/services/user.service';
import type { FormActionResult } from '@/types/formActions';
import { zodErrorsToFormActionResult } from '@/utils/form-actions';

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

type UpdateUserFieldErrors = {
  email?: string | string[];
  firstName?: string | string[];
  lastName?: string | string[];
  phone?: string | string[];
  company?: string | string[];
  acceptsMarketing?: string | string[];
};

export async function updateUserAction(
  input: UpdateUserInput,
): Promise<FormActionResult<UpdateUserFieldErrors> & UpdateUserFieldErrors> {
  const result = userSchema.safeParse(input);

  if (!result?.success) {
    const fieldErrors = result.error.formErrors.fieldErrors as UpdateUserFieldErrors;
    return { ...zodErrorsToFormActionResult(result.error), ...fieldErrors };
  }

  const { email, firstName, lastName, acceptsMarketing, company, phone } = result.data;

  const serviceResult = await UserService.updateUser({
    email,
    firstName,
    lastName,
    acceptsMarketing,
    company,
    phone,
  });

  if ('error' in serviceResult) {
    return serviceResult;
  }

  return {
    success: serviceResult.success || 'User updated successfully',
  };
}
