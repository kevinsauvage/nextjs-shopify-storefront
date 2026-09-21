import type { CustomerUserError, UserError } from '@/shopify/storefront';
import type { FormFieldErrors, FormState } from '@/types/formActions';

import type { ZodError } from 'zod';

/** Convert Zod validation errors into field-level form state. */
export function zodErrorsToFormState(zodError: ZodError): FormState {
  return { errors: zodError.formErrors.fieldErrors as FormFieldErrors, ok: false };
}

export function formError(message: string): FormState {
  return { message, ok: false };
}

export function formSuccess(message?: string): FormState {
  return { message, ok: true };
}

/** Collapse Shopify user errors into a single toast message. */
export function shopifyErrorsToFormState(
  errors?: Array<{ message?: string }> | null,
): FormState | null {
  if (!errors?.length) return null;

  const message = errors
    .map((error) => error.message)
    .filter((value): value is string => Boolean(value))
    .join(' ');

  return message ? formError(message) : null;
}

/**
 * Map a service result (`{ error }` / `{ customerUserErrors }` / `{ userErrors }`)
 * to form state. Returns `null` when the service succeeded.
 */
export function serviceErrorsToFormState(
  result: object,
  fallbackMessage = 'Something went wrong',
): FormState | null {
  const { customerUserErrors, error, userErrors } = result as {
    customerUserErrors?: unknown;
    error?: unknown;
    userErrors?: unknown;
  };

  if (typeof error === 'string') return formError(error);

  const shopifyErrors = (customerUserErrors ?? userErrors) as
    | Array<{ message?: string }>
    | undefined;

  if (shopifyErrors?.length) {
    return shopifyErrorsToFormState(shopifyErrors) ?? formError(fallbackMessage);
  }

  return null;
}

/**
 * Services use these to bubble Shopify user errors up to the action, which then
 * turns them into a form message via `serviceErrorsToFormState`.
 */
export function handleCustomerUserErrors(
  customerUserErrors?: CustomerUserError[] | null,
): { customerUserErrors: CustomerUserError[] } | null {
  return customerUserErrors?.length ? { customerUserErrors } : null;
}

export function handleUserErrors(
  userErrors?: UserError[] | null,
): { userErrors: UserError[] } | null {
  return userErrors?.length ? { userErrors } : null;
}
