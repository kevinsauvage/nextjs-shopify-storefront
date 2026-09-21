'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import config from '@/config';
import { userFeedback } from '@/data/userFeedback';
import { getClientIp } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { clearShopifyToken, getShopifyToken } from '@/lib/server/shopify-helpers';
import { AuthService } from '@/services/auth.service';
import { storefrontSdk } from '@/shopify';
import type { FormState } from '@/types/formActions';
import { safeLogError } from '@/utils/api-responses';
import { getCookieDeleteOptions } from '@/utils/cookie-security';
import {
  formError,
  formSuccess,
  serviceErrorsToFormState,
  zodErrorsToFormState,
} from '@/utils/form-actions';
import { safeInternalPath } from '@/utils/url';

import { z } from 'zod';

const tooManyAttempts = (): FormState =>
  formError('Too many attempts. Please try again in a few minutes.');

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

export async function registerAction(input: RegisterInput): Promise<FormState> {
  const result = registerSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const { email, password, firstName, lastName } = result.data;

  const ip = await getClientIp();
  if (await isRateLimited('auth:register', ip, 5, '10 m')) {
    return tooManyAttempts();
  }

  const serviceResult = await AuthService.register({ email, password, firstName, lastName });

  const errorState = serviceErrorsToFormState(serviceResult, 'Failed to create account');
  if (errorState) return errorState;

  redirect(config.routes.account);
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  redirectUrl: z.string().optional(),
});

type LoginInput = z.infer<typeof loginSchema>;

export async function loginAction(input: LoginInput): Promise<FormState> {
  const result = loginSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const { email, password, redirectUrl } = result.data;

  const ip = await getClientIp();
  if (await isRateLimited('auth:login', `${ip}:${email}`, 5, '10 m')) {
    return tooManyAttempts();
  }

  const serviceResult = await AuthService.login({ email, password });

  const errorState = serviceErrorsToFormState(serviceResult, 'Invalid email or password');
  if (errorState) return errorState;

  redirect(safeInternalPath(redirectUrl, config.routes.account));
}

const recoverSchema = z.object({
  email: z.string().email(),
});

type RecoverPasswordInput = z.infer<typeof recoverSchema>;

export const recoverPasswordAction = async (
  input: RecoverPasswordInput,
): Promise<FormState> => {
  const result = recoverSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const ip = await getClientIp();
  if (await isRateLimited('auth:recover', `${ip}:${result.data.email}`, 3, '15 m')) {
    return tooManyAttempts();
  }

  const serviceResult = await AuthService.recoverPassword({ email: result.data.email });

  const errorState = serviceErrorsToFormState(
    serviceResult,
    'An error occurred while recovering the password.',
  );
  if (errorState) return errorState;

  return formSuccess(userFeedback.sendRecoverEmail.success);
};

const resetSchema = z.object({
  password: z.string().min(8, { message: userFeedback.passwordLength }),
  resetUrl: z.string(),
});

type ResetPasswordInput = z.infer<typeof resetSchema>;

export const resetPasswordAction = async (
  input: ResetPasswordInput,
): Promise<FormState> => {
  const result = resetSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const { password, resetUrl } = result.data;

  const ip = await getClientIp();
  if (await isRateLimited('auth:reset', ip, 5, '15 m')) {
    return tooManyAttempts();
  }

  const serviceResult = await AuthService.resetPassword({ password, resetToken: resetUrl });

  const errorState = serviceErrorsToFormState(serviceResult, userFeedback.resetPassword.error);
  if (errorState) return errorState;

  redirect(config.routes.account);
};

/**
 * Log out: revoke the customer access token, clear the session cookies and
 * redirect to the login page. Meant to be invoked as a form action.
 */
export async function logoutAction(): Promise<void> {
  const token = await getShopifyToken();

  // Clear local session cookies first so logout always succeeds, even if the
  // revocation call is unavailable. The cookies are deleted with the same
  // domain they were set with, otherwise a `Domain=` cookie would survive.
  await clearShopifyToken();

  const cookieStore = await cookies();
  cookieStore.delete({ name: config.cookies.delegateToken, ...getCookieDeleteOptions() });

  if (token) {
    try {
      await storefrontSdk('private').customerAccessTokenDelete({
        customerAccessToken: token,
      });
    } catch (error) {
      // Surface the failure instead of swallowing it; the token expires on its own.
      safeLogError('logoutAction - token revocation', error);
    }
  }

  redirect(config.routes.login);
}
