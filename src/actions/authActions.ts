'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import config from '@/config';
import { userFeedback } from '@/data/userFeedback';
import { clearShopifyToken, getShopifyToken } from '@/lib/server/shopify-helpers';
import { AuthService } from '@/services/auth.service';
import { storefrontSdk } from '@/shopify';
import type { FormActionResult } from '@/types/formActions';
import { safeLogError } from '@/utils/api-responses';
import { zodErrorsToFormActionResult } from '@/utils/form-actions';

import { z } from 'zod';

const registerSchema = z
  .object({
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    password: z.string().min(6),
    passwordConfirm: z.string().min(6),
    redirectUrl: z.string().optional(),
  })
  .superRefine(({ passwordConfirm, password }, context) => {
    if (passwordConfirm !== password) {
      context.addIssue({
        code: 'custom',
        message: userFeedback.passwordDifferent,
        path: ['passwordConfirm'],
      });
    }
  });

type RegisterInput = z.infer<typeof registerSchema>;

type RegisterFieldErrors = {
  email?: string | string[];
  firstName?: string | string[];
  lastName?: string | string[];
  password?: string | string[];
  passwordConfirm?: string | string[];
};

export async function registerAction(
  input: RegisterInput,
): Promise<FormActionResult<RegisterFieldErrors> & RegisterFieldErrors> {
  const result = registerSchema.safeParse(input);
  if (!result?.success) {
    const fieldErrors = result.error.formErrors.fieldErrors as RegisterFieldErrors;
    return { ...zodErrorsToFormActionResult(result.error), ...fieldErrors };
  }

  const { email, password, firstName, lastName } = result.data;

  const serviceResult = await AuthService.register({
    email,
    password,
    firstName,
    lastName,
  });

  if ('error' in serviceResult) {
    return serviceResult;
  }

  redirect(config.routes.account);
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  redirectUrl: z.string().optional(),
});

type LoginInput = z.infer<typeof loginSchema>;

type LoginFieldErrors = {
  email?: string | string[];
  password?: string | string[];
};

export async function loginAction(
  input: LoginInput,
): Promise<FormActionResult<LoginFieldErrors> & LoginFieldErrors> {
  const result = loginSchema.safeParse(input);
  if (!result?.success) {
    const fieldErrors = result.error.formErrors.fieldErrors as LoginFieldErrors;
    return { ...zodErrorsToFormActionResult(result.error), ...fieldErrors };
  }

  const { email, password, redirectUrl } = result.data;

  const serviceResult = await AuthService.login({ email, password });

  if ('error' in serviceResult) {
    return serviceResult;
  }

  redirect(redirectUrl || config.routes.account);
}

const recoverSchema = z.object({
  email: z.string().email(),
});

type RecoverPasswordInput = z.infer<typeof recoverSchema>;

type RecoverFieldErrors = {
  email?: string | string[];
};

export const recoverPasswordAction = async (
  input: RecoverPasswordInput,
): Promise<FormActionResult<RecoverFieldErrors> & RecoverFieldErrors> => {
  const result = recoverSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors = result.error.formErrors.fieldErrors as RecoverFieldErrors;
    return { ...zodErrorsToFormActionResult(result.error), ...fieldErrors };
  }

  const { email } = result.data;

  const serviceResult = await AuthService.recoverPassword({ email });

  if ('error' in serviceResult) {
    return serviceResult;
  }

  return { success: userFeedback.sendRecoverEmail.success };
};

const resetSchema = z.object({
  password: z.string().min(8, { message: userFeedback.passwordLength }),
  resetUrl: z.string(),
});

type ResetPasswordInput = z.infer<typeof resetSchema>;

type ResetFieldErrors = {
  password?: string | string[];
};

export const resetPasswordAction = async (
  input: ResetPasswordInput,
): Promise<FormActionResult<ResetFieldErrors> & ResetFieldErrors> => {
  const result = resetSchema.safeParse(input);
  if (!result.success) {
    const fieldErrors = result.error.formErrors.fieldErrors as ResetFieldErrors;
    return { ...zodErrorsToFormActionResult(result.error), ...fieldErrors };
  }

  const { password, resetUrl } = result.data;

  const serviceResult = await AuthService.resetPassword({
    password,
    resetToken: resetUrl,
  });

  if ('error' in serviceResult) {
    const errorMessage = serviceResult.error || userFeedback.resetPassword.error;
    return { error: errorMessage };
  }

  redirect(config.routes.account);
};

/**
 * Log out: revoke the customer access token, clear the session cookies and
 * redirect to the login page. Meant to be invoked as a form action.
 */
export async function logoutAction(): Promise<void> {
  const token = await getShopifyToken();

  if (token) {
    try {
      await storefrontSdk('no-store').customerAccessTokenDelete({
        customerAccessToken: token,
      });
    } catch (error) {
      safeLogError('logoutAction - token revocation', error);
    }
  }

  await clearShopifyToken();

  const cookieStore = await cookies();
  cookieStore.delete(config.cookies.delegateToken);

  redirect(config.routes.login);
}
