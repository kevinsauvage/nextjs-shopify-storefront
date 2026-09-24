'use server';

import { redirect } from 'next/navigation';

import config from '@/config';
import { userFeedback } from '@/data/userFeedback';
import { reportError } from '@/lib/logger';
import { getClientIp } from '@/lib/server/client-ip';
import { isRateLimited } from '@/lib/server/rate-limit';
import { clearShopifyToken, getShopifyToken } from '@/lib/server/shopify-helpers';
import { AuthService } from '@/services/auth.service';
import { storefrontSdk } from '@/shopify';
import type { FormState } from '@/types/formActions';
import {
  formError,
  formSuccess,
  serviceErrorsToFormState,
  zodErrorsToFormState,
} from '@/utils/form-actions';
import { isAllowedPasswordResetUrl, RESET_URL_MAX_LENGTH, safeInternalPath } from '@/utils/url';
import { emailField, nameField, passwordField } from '@/utils/validation';

import { z } from 'zod';

const tooManyAttempts = (): FormState =>
  formError('Too many attempts. Please try again in a few minutes.');

const registerSchema = z
  .object({
    email: emailField,
    firstName: nameField,
    lastName: nameField,
    password: passwordField,
    passwordConfirm: passwordField,
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
  if (await isRateLimited('auth:register', ip, 5, '10 m', { failClosed: true })) {
    return tooManyAttempts();
  }

  const serviceResult = await AuthService.register({ email, password, firstName, lastName });

  const errorState = serviceErrorsToFormState(serviceResult, 'Failed to create account');
  if (errorState) return errorState;

  redirect(config.routes.account);
}

const loginSchema = z.object({
  email: emailField,
  password: passwordField,
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
  // Two buckets: per-target (ip:email) and a global per-IP cap. The latter stops
  // credential stuffing / spraying across many different emails from one host.
  // The email is normalized so casing/whitespace variants share one bucket.
  const [targetLimited, ipLimited] = await Promise.all([
    isRateLimited('auth:login', `${ip}:${email.trim().toLowerCase()}`, 5, '10 m', {
      failClosed: true,
    }),
    isRateLimited('auth:login:ip', ip, 30, '10 m', { failClosed: true }),
  ]);
  if (targetLimited || ipLimited) {
    return tooManyAttempts();
  }

  const serviceResult = await AuthService.login({ email, password });

  const errorState = serviceErrorsToFormState(serviceResult, 'Invalid email or password');
  if (errorState) return errorState;

  redirect(safeInternalPath(redirectUrl, config.routes.account));
}

const recoverSchema = z.object({
  email: emailField,
});

type RecoverPasswordInput = z.infer<typeof recoverSchema>;

export const recoverPasswordAction = async (input: RecoverPasswordInput): Promise<FormState> => {
  const result = recoverSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const ip = await getClientIp();
  const [targetLimited, ipLimited] = await Promise.all([
    isRateLimited('auth:recover', `${ip}:${result.data.email.trim().toLowerCase()}`, 3, '15 m', {
      failClosed: true,
    }),
    isRateLimited('auth:recover:ip', ip, 10, '15 m', { failClosed: true }),
  ]);
  if (targetLimited || ipLimited) {
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
  password: z
    .string()
    .min(8, { message: userFeedback.passwordLength })
    .max(128, { message: userFeedback.passwordLength }),
  resetUrl: z
    .string()
    .url({ message: 'Invalid or expired reset link' })
    .max(RESET_URL_MAX_LENGTH, { message: 'Invalid or expired reset link' })
    .refine(isAllowedPasswordResetUrl, { message: 'Invalid or expired reset link' }),
});

type ResetPasswordInput = z.infer<typeof resetSchema>;

export const resetPasswordAction = async (input: ResetPasswordInput): Promise<FormState> => {
  const result = resetSchema.safeParse(input);
  if (!result.success) {
    return zodErrorsToFormState(result.error);
  }

  const { password, resetUrl } = result.data;

  const ip = await getClientIp();
  if (await isRateLimited('auth:reset', ip, 5, '15 m', { failClosed: true })) {
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

  if (token) {
    try {
      await storefrontSdk('private').customerAccessTokenDelete({
        customerAccessToken: token,
      });
    } catch (error) {
      // Surface the failure instead of swallowing it; the token expires on its own.
      reportError('logoutAction - token revocation', error);
    }
  }

  redirect(config.routes.login);
}
